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

import { softDeleteParent } from "../actions"
import { ParentForm } from "./parent-form"

interface ParentDetailHeaderProps {
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

function sanitizePhoneForWhatsapp(phone: string): string {
  const digits = phone.replace(/\D+/g, "")
  if (digits.length === 0) return ""
  if (digits.startsWith("00")) return digits.slice(2)
  if (digits.startsWith("39")) return digits
  return `39${digits}`
}

export function ParentDetailHeader({ parent }: ParentDetailHeaderProps) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const whatsappNumber = parent.phone
    ? sanitizePhoneForWhatsapp(parent.phone)
    : ""

  function handleDelete() {
    startTransition(async () => {
      const result = await softDeleteParent(parent.id)
      if (result.ok) {
        toast.success("Genitore eliminato")
        router.push("/admin/parents")
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {parent.email && (
          <Button variant="outline" size="sm" asChild>
            <a href={`mailto:${parent.email}`}>
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
            <AlertDialogTitle>Eliminare questo genitore?</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per eliminare {parent.firstName} {parent.lastName}.
              L&apos;operazione è reversibile (soft delete) ma il genitore non
              sarà più visibile nell&apos;elenco.
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
