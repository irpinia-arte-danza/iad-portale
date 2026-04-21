"use client"

import { useState } from "react"
import { Plus } from "lucide-react"

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
}

export function CourseCreateDialog({ teachers }: CourseCreateDialogProps) {
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
          <DialogTitle>Aggiungi corso</DialogTitle>
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
