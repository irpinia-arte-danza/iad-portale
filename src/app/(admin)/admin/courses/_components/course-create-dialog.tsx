"use client"

import { useState } from "react"
import { Plus } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import { CourseForm } from "./course-form"

type TeacherOption = {
  id: string
  firstName: string
  lastName: string
}

interface CourseCreateDialogProps {
  teachers: TeacherOption[]
  currentAcademicYearLabel: string | null
}

export function CourseCreateDialog({
  teachers,
  currentAcademicYearLabel,
}: CourseCreateDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Aggiungi corso
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle>Aggiungi corso</DialogTitle>
            {currentAcademicYearLabel && (
              <Badge variant="outline" className="font-mono text-xs">
                AA {currentAcademicYearLabel}
              </Badge>
            )}
          </div>
          <DialogDescription>
            Configura un nuovo corso. L&apos;insegnante e gli orari possono
            essere aggiunti o modificati più tardi.
          </DialogDescription>
        </DialogHeader>
        <CourseForm
          mode="create"
          teachers={teachers}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
