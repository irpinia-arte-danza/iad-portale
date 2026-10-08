"use client"

import { useState, useTransition } from "react"
import { MessageCircle, Pencil, RefreshCw, Send, Trash2 } from "lucide-react"
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
import { whatsappHref } from "@/lib/utils/whatsapp"

import { useSendAccessInvite } from "../../_components/access/use-send-access-invite"
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
  accessStatus?: AccessStatus
  layout?: RowActionsLayout
}

export function ParentRowActions({
  parent,
  accessStatus,
  layout,
}: ParentRowActionsProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const { send, pendingId } = useSendAccessInvite("PARENT")

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

  const showAccessItem = accessStatus && accessStatus.kind !== "ACTIVE"

  const whatsapp = parent.phone ? whatsappHref(parent.phone) : null

  const actions: RowAction[] = [
    // Il tasto della card: scrivere al genitore è il motivo per cui si apre
    // l'elenco dal telefono. In tabella c'è già nella colonna Telefono.
    ...(whatsapp
      ? [
          {
            key: "whatsapp",
            label: "WhatsApp",
            icon: MessageCircle,
            href: whatsapp,
            external: true,
            primary: true,
            cardOnly: true,
          } satisfies RowAction,
        ]
      : []),
    {
      key: "edit",
      label: "Modifica",
      icon: Pencil,
      onSelect: () => setEditOpen(true),
    },
    ...(showAccessItem
      ? [
          {
            key: "access",
            label:
              accessStatus.kind === "NO_EMAIL"
                ? "Invia accesso (manca l'email)"
                : accessStatus.kind === "INVITED"
                  ? "Reinvia accesso"
                  : "Invia accesso",
            icon: accessStatus.kind === "INVITED" ? RefreshCw : Send,
            disabled:
              accessStatus.kind === "NO_EMAIL" || pendingId === parent.id,
            onSelect: () => send(parent.id),
          } satisfies RowAction,
        ]
      : []),
    {
      key: "delete",
      label: "Elimina",
      icon: Trash2,
      destructive: true,
      separatorBefore: true,
      onSelect: () => setDeleteOpen(true),
    },
  ]

  return (
    <>
      <RowActionsRenderer actions={actions} layout={layout} />

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
              più visibile nell&apos;elenco e non potrà più entrare nell&apos;area
              genitori finché non viene ripristinato dal Cestino.
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
