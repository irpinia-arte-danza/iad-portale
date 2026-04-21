"use client"

import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Form } from "@/components/ui/form"
import { Button } from "@/components/ui/button"

import {
  guardianRelationSchema,
  type GuardianRelationValues,
} from "@/lib/schemas/guardian"
import type { AthleteParentRelation } from "../queries"
import { updateGuardianRelation } from "../guardians-actions"
import { GuardianRelationFields } from "./guardian-relation-fields"

interface GuardianEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  athleteParent: AthleteParentRelation
  otherRelations: AthleteParentRelation[]
  onSuccess?: () => void
}

export function GuardianEditDialog({
  open,
  onOpenChange,
  athleteParent,
  otherRelations,
  onSuccess,
}: GuardianEditDialogProps) {
  const [isPending, startTransition] = useTransition()

  const lockedPrimaryContact = otherRelations.find((r) => r.isPrimaryContact)
  const lockedPrimaryPayer = otherRelations.find((r) => r.isPrimaryPayer)

  const lockedPrimaryContactName = lockedPrimaryContact
    ? `${lockedPrimaryContact.parent.firstName} ${lockedPrimaryContact.parent.lastName}`
    : null
  const lockedPrimaryPayerName = lockedPrimaryPayer
    ? `${lockedPrimaryPayer.parent.firstName} ${lockedPrimaryPayer.parent.lastName}`
    : null

  const form = useForm<GuardianRelationValues>({
    resolver: zodResolver(guardianRelationSchema),
    defaultValues: {
      relationship: athleteParent.relationship,
      isPrimaryContact: athleteParent.isPrimaryContact,
      isPrimaryPayer: athleteParent.isPrimaryPayer,
      isPickupAuthorized: athleteParent.isPickupAuthorized,
      hasParentalAuthority: athleteParent.hasParentalAuthority,
    },
  })

  function onSubmit(values: GuardianRelationValues) {
    startTransition(async () => {
      const result = await updateGuardianRelation(athleteParent.id, values)
      if (result.ok) {
        toast.success("Relazione aggiornata")
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifica relazione</DialogTitle>
          <DialogDescription>
            Aggiorna la relazione e i permessi di{" "}
            {athleteParent.parent.firstName} {athleteParent.parent.lastName}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <GuardianRelationFields
              lockedPrimaryContactName={lockedPrimaryContactName}
              lockedPrimaryPayerName={lockedPrimaryPayerName}
            />
            <div className="flex sm:justify-end">
              <Button
                type="submit"
                disabled={isPending}
                className="w-full sm:w-auto"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvataggio...
                  </>
                ) : (
                  "Salva modifiche"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
