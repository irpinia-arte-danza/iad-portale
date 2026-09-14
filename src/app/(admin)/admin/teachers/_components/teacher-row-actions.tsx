"use client"

import { useState, useTransition } from "react"
import { MoreHorizontal, Pencil, RefreshCw, Send, Trash2 } from "lucide-react"
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
import type { AccessStatus } from "@/lib/auth/access-status-types"

import { useSendAccessInvite } from "../../_components/access/use-send-access-invite"
import { softDeleteTeacher } from "../actions"
import { TeacherForm } from "./teacher-form"

interface TeacherRowActionsProps {
  teacher: {
    id: string
    firstName: string
    lastName: string
    email: string | null
    phone: string | null
    fiscalCode: string | null
    qualifications: string | null
  }
  accessStatus?: AccessStatus
}

export function TeacherRowActions({ teacher, accessStatus }: TeacherRowActionsProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const { send, pendingId } = useSendAccessInvite("TEACHER")

  function handleDelete() {
    startTransition(async () => {
      const result = await softDeleteTeacher(teacher.id)
      if (result.ok) {
        toast.success("Insegnante eliminato")
        setDeleteOpen(false)
      } else {
        toast.error(result.error)
      }
    })
  }

  const showAccessItem = accessStatus && accessStatus.kind !== "ACTIVE"

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
          {showAccessItem ? (
            <DropdownMenuItem
              disabled={accessStatus.kind === "NO_EMAIL" || pendingId === teacher.id}
              onClick={() => send(teacher.id)}
            >
              {accessStatus.kind === "INVITED" ? (
                <RefreshCw className="h-4 w-4" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {accessStatus.kind === "NO_EMAIL"
                ? "Invia accesso (manca l'email)"
                : accessStatus.kind === "INVITED"
                  ? "Reinvia accesso"
                  : "Invia accesso"}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setDeleteOpen(true)}
            variant="destructive"
          >
            <Trash2 className="h-4 w-4" />
            Elimina
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
            onSuccess={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questo insegnante?</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per eliminare {teacher.firstName} {teacher.lastName}.
              L&apos;operazione è reversibile (soft delete) ma l&apos;insegnante
              non sarà più visibile nell&apos;elenco e non potrà più entrare
              nell&apos;area insegnanti finché non viene ripristinato dal Cestino.
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
