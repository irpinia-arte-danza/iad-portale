"use client"

import { useState, useTransition } from "react"
import { Archive, ArchiveRestore, MoreHorizontal, Pencil } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { toggleCourseActive } from "../actions"
import { CourseForm } from "./course-form"
import { COURSE_TYPE_LABELS } from "@/lib/schemas/course"

interface CourseRowActionsProps {
  course: {
    id: string
    name: string
    type: keyof typeof COURSE_TYPE_LABELS
    description: string | null
    minAge: number | null
    maxAge: number | null
    level: string | null
    capacity: number
    monthlyFeeCents: number
    trimesterFeeCents: number | null
    teacherId: string | null
    isActive: boolean
    teacherCourses?: {
      isPrimary: boolean
      teacher: { id: string; firstName: string; lastName: string }
    }[]
  }
  teachers: Array<{ id: string; firstName: string; lastName: string }>
}

export function CourseRowActions({ course, teachers }: CourseRowActionsProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    const nextState = !course.isActive
    startTransition(async () => {
      const result = await toggleCourseActive(course.id, nextState)
      if (result.ok) {
        toast.success(nextState ? "Corso riattivato" : "Corso archiviato")
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Azioni"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
            Modifica
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleToggle} disabled={isPending}>
            {course.isActive ? (
              <>
                <Archive className="h-4 w-4" />
                Archivia
              </>
            ) : (
              <>
                <ArchiveRestore className="h-4 w-4" />
                Riattiva
              </>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifica corso</DialogTitle>
            <DialogDescription>
              Aggiorna i dati di {course.name}.
            </DialogDescription>
          </DialogHeader>
          <CourseForm
            mode="edit"
            courseId={course.id}
            teachers={teachers}
            defaultValues={{
              name: course.name,
              type: course.type,
              description: course.description ?? "",
              minAge: course.minAge ?? undefined,
              maxAge: course.maxAge ?? undefined,
              level: course.level ?? "",
              capacity: course.capacity,
              monthlyFeeEur: course.monthlyFeeCents / 100,
              trimesterFeeEur:
                course.trimesterFeeCents !== null
                  ? course.trimesterFeeCents / 100
                  : undefined,
              teachers: (course.teacherCourses ?? []).map((tc) => ({
                teacherId: tc.teacher.id,
                isPrimary: tc.isPrimary,
              })),
              teacherId: course.teacherId ?? "",
            }}
            onSuccess={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
