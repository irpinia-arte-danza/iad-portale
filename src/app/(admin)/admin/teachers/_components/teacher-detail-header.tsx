"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Mail, MessageCircle, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { softDeleteTeacher } from "../actions"
import { TeacherForm } from "./teacher-form"

interface TeacherDetailHeaderProps {
  teacher: {
    id: string
    firstName: string
    lastName: string
    email: string | null
    phone: string | null
    fiscalCode: string | null
    qualifications: string | null
  }
}

function sanitizePhoneForWhatsapp(phone: string): string {
  const digits = phone.replace(/\D+/g, "")
  if (digits.length === 0) return ""
  if (digits.startsWith("00")) return digits.slice(2)
  if (digits.startsWith("39")) return digits
  return `39${digits}`
}

export function TeacherDetailHeader({ teacher }: TeacherDetailHeaderProps) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const whatsappNumber = teacher.phone
    ? sanitizePhoneForWhatsapp(teacher.phone)
    : ""

  function handleDelete() {
    startTransition(async () => {
      const result = await softDeleteTeacher(teacher.id)
      if (result.ok) {
        toast.success("Insegnante eliminata")
        router.push("/admin/teachers")
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {teacher.email && (
          <Button variant="outline" size="sm" asChild>
            <a href={`mailto:${teacher.email}`}>
              <Mail className="h-4 w-4" />
              Email
            </a>
          </Button>
        )}
        {whatsappNumber && (
          <Button variant="outline" size="sm" asChild>
            <a
              href={`https://wa.me/${whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4" />
          Modifica
        </Button>
        <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)}>
          <Trash2 className="h-4 w-4" />
          Elimina
        </Button>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifica insegnante</DialogTitle>
            <DialogDescription>
              Aggiorna i dati di {teacher.firstName} {teacher.lastName}.
            </DialogDescription>
          </DialogHeader>
          <TeacherForm
            mode="edit"
            teacherId={teacher.id}
            defaultValues={{
              firstName: teacher.firstName,
              lastName: teacher.lastName,
              email: teacher.email ?? "",
              phone: teacher.phone ?? "",
              fiscalCode: teacher.fiscalCode ?? "",
              qualifications: teacher.qualifications ?? "",
            }}
            onSuccess={() => {
              setEditOpen(false)
              router.refresh()
            }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questa insegnante?</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per eliminare {teacher.firstName} {teacher.lastName}.
              L&apos;operazione è reversibile (soft delete) ma l&apos;insegnante
              non sarà più visibile nell&apos;elenco.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? "Eliminazione..." : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
