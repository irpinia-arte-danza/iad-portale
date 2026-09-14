"use client"

import { useState } from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import type { AthleteWithFormRelations } from "../../payments/queries"
import { PaymentForm } from "../../payments/_components/payment-form"
import { ReceiptIssuePanel } from "../../receipts/_components/receipt-issue-panel"
import { useReceiptIssue } from "../../receipts/_components/use-receipt-issue"

interface ScheduleSettleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  schedule: {
    id: string
    courseEnrollmentId: string
    courseName: string
    dueDate: Date
    amountCents: number
  }
  athleteId: string
  athleteFirstName: string
  athleteLastName: string
  athletesForPaymentForm: AthleteWithFormRelations[]
  onSuccess?: () => void
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function formatEur(cents: number): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100)
}

function firstDayOfMonthUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
}

function lastDayOfMonthUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0))
}

export function ScheduleSettleDialog({
  open,
  onOpenChange,
  schedule,
  athleteId,
  athleteFirstName,
  athleteLastName,
  athletesForPaymentForm,
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
                {athleteLastName} {athleteFirstName} — {schedule.courseName}.
                Emetti la ricevuta adesso oppure più tardi dall&apos;elenco
                pagamenti.
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
                scadenza {formatDate(schedule.dueDate)}
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-md border bg-muted/50 p-3 text-sm">
              <div>
                Importo atteso:{" "}
                <strong className="font-mono">
                  {formatEur(schedule.amountCents)}
                </strong>
              </div>
              <div className="text-muted-foreground">Tipo: Quota mensile</div>
            </div>

            <PaymentForm
              athletes={athletesForPaymentForm}
              defaultValues={{
                athleteId,
                courseEnrollmentId: schedule.courseEnrollmentId,
                feeType: "MONTHLY",
                amountEur: schedule.amountCents / 100,
                paymentDate: new Date(),
                periodStart: firstDayOfMonthUTC(schedule.dueDate),
                periodEnd: lastDayOfMonthUTC(schedule.dueDate),
              }}
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
