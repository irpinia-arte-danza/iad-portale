"use client"

import { useState, useTransition } from "react"
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"
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

import { softDeleteParent } from "../actions"
import { ParentForm } from "./parent-form"

interface ParentRowActionsProps {
  parent: {
    id: string
    firstName: string
    lastName: string
    email: string | null
    phone: string | null
    receivesEmailCommunications: boolean
    remindersEnabled: boolean
    dateOfBirth: Date | null
    fiscalCode: string | null
    placeOfBirth: string | null
    provinceOfBirth: string | null
    residenceStreet: string | null
    residenceNumber: string | null
    residenceCity: string | null
    residenceProvince: string | null
    residenceCap: string | null
  }
}

export function ParentRowActions({ parent }: ParentRowActionsProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      const result = await softDeleteParent(parent.id)
      if (result.ok) {
        toast.success("Genitore eliminato")
        setDeleteOpen(false)
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Azioni">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
            Modifica
          </DropdownMenuItem>
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
            <DialogTitle>Modifica genitore</DialogTitle>
            <DialogDescription>
              Aggiorna i dati di {parent.firstName} {parent.lastName}.
            </DialogDescription>
          </DialogHeader>
          <ParentForm
            mode="edit"
            parentId={parent.id}
            defaultValues={{
              firstName: parent.firstName,
              lastName: parent.lastName,
              email: parent.email ?? "",
              phone: parent.phone ?? "",
              receivesEmailCommunications: parent.receivesEmailCommunications,
              remindersEnabled: parent.remindersEnabled,
              dateOfBirth: parent.dateOfBirth ?? undefined,
              fiscalCode: parent.fiscalCode ?? "",
              placeOfBirth: parent.placeOfBirth ?? "",
              provinceOfBirth: parent.provinceOfBirth ?? "",
              residenceStreet: parent.residenceStreet ?? "",
              residenceNumber: parent.residenceNumber ?? "",
              residenceCity: parent.residenceCity ?? "",
              residenceProvince: parent.residenceProvince ?? "",
              residenceCap: parent.residenceCap ?? "",
            }}
            onSuccess={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questo genitore?</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per eliminare {parent.firstName} {parent.lastName}.
              L&apos;operazione è reversibile (soft delete) ma il genitore non sarà
              più visibile nell&apos;elenco.
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
