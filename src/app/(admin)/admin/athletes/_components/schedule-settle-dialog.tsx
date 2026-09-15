"use client"

import { useState } from "react"
import type { FeeType } from "@prisma/client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { PaymentCreateValues } from "@/lib/schemas/payment"

import type {
  AthleteWithFormRelations,
  OpenScheduleOption,
} from "../../payments/queries"
import { PaymentForm } from "../../payments/_components/payment-form"
import { ReceiptIssuePanel } from "../../receipts/_components/receipt-issue-panel"
import { useReceiptIssue } from "../../receipts/_components/use-receipt-issue"

export type SettleSchedule = {
  id: string
  feeType: FeeType
  // null per la quota associativa, che non è legata a un corso
  courseEnrollmentId: string | null
  courseName: string
  dueDate: Date
  amountCents: number
}

// Da montare una sola volta per sezione (ScheduleSettleProvider), mai dentro
// la riga della scadenza: vedi il commento nel provider.
interface ScheduleSettleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  schedule: SettleSchedule
  athleteId: string
  athleteFirstName: string
  athleteLastName: string
  athletesForPaymentForm: AthleteWithFormRelations[]
  openSchedulesByAthlete: Record<string, OpenScheduleOption[]>
  onSuccess?: () => void
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

// Stesso form di /admin/payments con la scadenza cliccata già spuntata: le
// altre scadenze aperte dell'allieva si possono aggiungere allo stesso incasso.
function paymentDefaults(
  schedule: SettleSchedule,
  athleteId: string,
): Partial<PaymentCreateValues> {
  return {
    athleteId,
    paymentScheduleIds: [schedule.id],
    scheduleAmountsEur: { [schedule.id]: schedule.amountCents / 100 },
    feeType: schedule.feeType,
    amountEur: schedule.amountCents / 100,
    paymentDate: new Date(),
  }
}

export function ScheduleSettleDialog({
  open,
  onOpenChange,
  schedule,
  athleteId,
  athleteFirstName,
  athleteLastName,
  athletesForPaymentForm,
  openSchedulesByAthlete,
  onSuccess,
}: ScheduleSettleDialogProps) {
  const [registered, setRegistered] = useState(false)
  const receipt = useReceiptIssue()

  function handleOpenChange(next: boolean) {
    if (!next && receipt.state.phase === "issuing") return
    onOpenChange(next)
    if (!next) {
      setRegistered(false)
      receipt.reset()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {registered ? (
          <>
            <DialogHeader>
              <DialogTitle>Pagamento registrato</DialogTitle>
              <DialogDescription>
                {athleteLastName} {athleteFirstName}. Emetti la ricevuta adesso
                oppure più tardi dall&apos;elenco pagamenti.
              </DialogDescription>
            </DialogHeader>
            <ReceiptIssuePanel
              state={receipt.state}
              onConfirm={receipt.confirm}
              onClose={() => handleOpenChange(false)}
              dismissLabel="Chiudi senza ricevuta"
            />
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Salda scadenza</DialogTitle>
              <DialogDescription>
                {athleteLastName} {athleteFirstName} — {schedule.courseName} —
                scadenza {formatDate(schedule.dueDate)}. Puoi spuntare altre
                scadenze aperte per incassarle insieme, con una sola ricevuta.
              </DialogDescription>
            </DialogHeader>

            <PaymentForm
              athletes={athletesForPaymentForm}
              openSchedulesByAthlete={openSchedulesByAthlete}
              defaultValues={paymentDefaults(schedule, athleteId)}
              onSuccess={(paymentId) => {
                setRegistered(true)
                onSuccess?.()
                void receipt.begin(paymentId)
              }}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
