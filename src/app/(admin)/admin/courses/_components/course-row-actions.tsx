"use client"

import { useState, useTransition } from "react"
import { Archive, ArchiveRestore, Pencil } from "lucide-react"
import { toast } from "sonner"

import {
  RowActionsRenderer,
  type RowAction,
  type RowActionsLayout,
} from "@/components/lists/row-actions"
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
  layout?: RowActionsLayout
  // "Assegna" nella colonna Insegnante apre questo stesso dialog: un modulo
  // solo, non una seconda strada per fare la stessa cosa
  editRequested?: boolean
  onEditClosed?: () => void
}

export function CourseRowActions({
  course,
  teachers,
  layout,
  editRequested = false,
  onEditClosed,
}: CourseRowActionsProps) {
  const [editOpenLocal, setEditOpen] = useState(false)
  const editOpen = editOpenLocal || editRequested
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

  const actions: RowAction[] = [
    {
      key: "edit",
      label: "Modifica",
      icon: Pencil,
      onSelect: () => setEditOpen(true),
    },
    {
      key: "toggle",
      label: course.isActive ? "Archivia" : "Riattiva",
      icon: course.isActive ? Archive : ArchiveRestore,
      disabled: isPending,
      separatorBefore: true,
      onSelect: handleToggle,
    },
  ]

  return (
    <>
      <RowActionsRenderer actions={actions} layout={layout} />

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open)
          if (!open) onEditClosed?.()
        }}
      >
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
            onSuccess={() => {
              setEditOpen(false)
              onEditClosed?.()
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
