"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Archive, ArchiveRestore, Pencil } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { COURSE_TYPE_LABELS } from "@/lib/schemas/course"

import { toggleCourseActive } from "../actions"
import { CourseForm } from "./course-form"

type CourseType = keyof typeof COURSE_TYPE_LABELS

interface CourseDetailHeaderProps {
  course: {
    id: string
    name: string
    type: CourseType
    description: string | null
    minAge: number | null
    maxAge: number | null
    level: string | null
    capacity: number
    monthlyFeeCents: number
    trimesterFeeCents: number | null
    teacherId: string | null
    isActive: boolean
  }
  teachers: Array<{ id: string; firstName: string; lastName: string }>
}

export function CourseDetailHeader({
  course,
  teachers,
}: CourseDetailHeaderProps) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    const nextState = !course.isActive
    startTransition(async () => {
      const result = await toggleCourseActive(course.id, nextState)
      if (result.ok) {
        toast.success(nextState ? "Corso riattivato" : "Corso archiviato")
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4" />
          Modifica
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleToggle}
          disabled={isPending}
        >
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
        </Button>
      </div>

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
              teacherId: course.teacherId ?? "",
            }}
            onSuccess={() => {
              setEditOpen(false)
              router.refresh()
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
