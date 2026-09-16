"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { FileText } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import {
  compareScheduleLines,
  describeScheduleAdmin,
  paymentFeeTypeLabel,
  scheduleAdminHref,
} from "@/lib/payments/schedule-lines"
import { PAYMENT_METHOD_LABELS } from "@/lib/schemas/payment"
import { formatDateShort } from "@/lib/utils/format"

import { ReceiptEmailActions } from "../../receipts/_components/receipt-email-actions"
import { ReceiptIssueDialog } from "../../receipts/_components/receipt-issue-dialog"
import { useReceiptIssue } from "../../receipts/_components/use-receipt-issue"
import { getPaymentDetail } from "../actions"
import type { PaymentWithRelations } from "../queries"

interface PaymentDetailSheetProps {
  paymentId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CURRENCY = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
})

const DATE_LONG = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "long",
  year: "numeric",
})

const MONTH_YEAR = new Intl.DateTimeFormat("it-IT", {
  month: "long",
  year: "numeric",
})

function formatPeriod(start: Date | null, end: Date | null): string | null {
  if (!start && !end) return null
  if (start && end) {
    const startLabel = MONTH_YEAR.format(start)
    const endLabel = MONTH_YEAR.format(end)
    if (startLabel === endLabel) return startLabel
    return `${startLabel} → ${endLabel}`
  }
  if (start) return MONTH_YEAR.format(start)
  if (end) return MONTH_YEAR.format(end)
  return null
}

export function PaymentDetailSheet({
  paymentId,
  open,
  onOpenChange,
}: PaymentDetailSheetProps) {
  const [payment, setPayment] = useState<PaymentWithRelations | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)
  const receiptFlow = useReceiptIssue()

  useEffect(() => {
    if (!open || !paymentId) {
      return
    }

    let cancelled = false
    setIsLoading(true)
    setPayment(null)

    getPaymentDetail(paymentId)
      .then((result) => {
        if (cancelled) return
        if (result.ok && result.data) {
          setPayment(result.data.payment)
        } else if (!result.ok) {
          toast.error(result.error)
          onOpenChange(false)
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, paymentId, onOpenChange, reloadToken])

  function closeReceiptFlow() {
    const issuedNow =
      receiptFlow.state.phase === "issued" && !receiptFlow.state.alreadyIssued
    receiptFlow.reset()
    if (issuedNow) setReloadToken((token) => token + 1)
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Dettaglio pagamento</SheetTitle>
            <SheetDescription>
              {payment
                ? `${payment.athlete.lastName} ${payment.athlete.firstName}`
                : "Caricamento in corso..."}
            </SheetDescription>
          </SheetHeader>

          <div className="px-4 pb-6">
            {isLoading || !payment ? (
              <div className="space-y-4">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : (
              <PaymentDetailBody
                payment={payment}
                onIssueReceipt={() => receiptFlow.begin(payment.id)}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      <ReceiptIssueDialog
        state={receiptFlow.state}
        onConfirm={receiptFlow.confirm}
        onClose={closeReceiptFlow}
      />
    </>
  )
}

function PaymentDetailBody({
  payment,
  onIssueReceipt,
}: {
  payment: PaymentWithRelations
  onIssueReceipt: () => void
}) {
  const period = formatPeriod(payment.periodStart, payment.periodEnd)
  const isReversed = payment.status === "REVERSED"
  const receipt = payment.receipt
  const receiptCancelled = receipt?.status === "CANCELLED"

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {isReversed ? (
          <Badge variant="destructive">Stornato</Badge>
        ) : (
          <Badge className="bg-emerald-600 hover:bg-emerald-600">Pagato</Badge>
        )}
        <Badge variant="secondary" className="whitespace-normal">
          {paymentFeeTypeLabel(payment)}
        </Badge>
        {payment.academicYear && (
          <Badge variant="outline" className="font-mono text-xs">
            AA {payment.academicYear.label}
          </Badge>
        )}
        {payment.fiscalYear && (
          <Badge variant="outline" className="font-mono text-xs">
            AF {payment.fiscalYear.year}
          </Badge>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">Importo</p>
        <p className="font-mono text-2xl font-semibold">
          {CURRENCY.format(payment.amountCents / 100)}
        </p>
      </div>

      <div className="space-y-2 rounded-md border p-3">
        <h4 className="text-xs text-muted-foreground">Ricevuta</h4>
        {receipt ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={
                  receiptCancelled
                    ? "font-mono text-sm line-through"
                    : "font-mono text-sm font-medium"
                }
              >
                n. {receipt.receiptNumber}
              </span>
              {receiptCancelled ? (
                <Badge variant="destructive">Annullata</Badge>
              ) : (
                <Badge variant="outline">Valida</Badge>
              )}
              <span className="text-xs text-muted-foreground">
                emessa il {formatDateShort(receipt.issueDate)}
              </span>
            </div>
            {receiptCancelled && receipt.cancelReason ? (
              <p className="text-xs text-muted-foreground">
                Annullata per storno: {receipt.cancelReason}
              </p>
            ) : null}
            <ReceiptEmailActions
              receiptId={receipt.id}
              status={receipt.status}
              payerName={receipt.payerName}
              payerEmail={receipt.payerEmail}
            />
          </>
        ) : isReversed ? (
          <p className="text-sm text-muted-foreground">
            Pagamento stornato: nessuna ricevuta.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Ricevuta non ancora emessa.
            </p>
            <Button className="min-h-11 w-full" onClick={onIssueReceipt}>
              <FileText className="h-4 w-4" />
              Emetti ricevuta
            </Button>
          </>
        )}
      </div>

      <dl className="grid gap-3 text-sm">
        <div className="grid grid-cols-[120px_1fr] items-baseline gap-2">
          <dt className="text-xs text-muted-foreground">Data pagamento</dt>
          <dd className="font-mono">{DATE_LONG.format(payment.paymentDate)}</dd>
        </div>
        <div className="grid grid-cols-[120px_1fr] items-baseline gap-2">
          <dt className="text-xs text-muted-foreground">Metodo</dt>
          <dd>{PAYMENT_METHOD_LABELS[payment.method]}</dd>
        </div>
        {period && (
          <div className="grid grid-cols-[120px_1fr] items-baseline gap-2">
            <dt className="text-xs text-muted-foreground">Periodo</dt>
            <dd>{period}</dd>
          </div>
        )}
        <div className="grid grid-cols-[120px_1fr] items-baseline gap-2">
          <dt className="text-xs text-muted-foreground">Allieva</dt>
          <dd>
            <Link
              href={`/admin/athletes/${payment.athlete.id}`}
              className="font-medium hover:underline"
            >
              {payment.athlete.lastName} {payment.athlete.firstName}
            </Link>
          </dd>
        </div>
        {payment.parent && (
          <div className="grid grid-cols-[120px_1fr] items-baseline gap-2">
            <dt className="text-xs text-muted-foreground">Pagante</dt>
            <dd>
              <Link
                href={`/admin/parents/${payment.parent.id}`}
                className="font-medium hover:underline"
              >
                {payment.parent.lastName} {payment.parent.firstName}
              </Link>
            </dd>
          </div>
        )}
        {payment.courseEnrollment?.course && (
          <div className="grid grid-cols-[120px_1fr] items-baseline gap-2">
            <dt className="text-xs text-muted-foreground">Corso</dt>
            <dd>
              <Link
                href={`/admin/courses/${payment.courseEnrollment.course.id}`}
                className="hover:underline"
              >
                {payment.courseEnrollment.course.name}
              </Link>
            </dd>
          </div>
        )}
      </dl>

      {payment.paymentSchedules.length > 0 && (
        <div className="space-y-2 border-t pt-4">
          <h4 className="text-xs text-muted-foreground">
            {payment.paymentSchedules.length === 1
              ? "Scadenza chiusa"
              : `Scadenze chiuse (${payment.paymentSchedules.length})`}
          </h4>
          <ul className="divide-y rounded-md border">
            {[...payment.paymentSchedules]
              .sort(compareScheduleLines)
              .map((schedule) => (
                <li
                  key={schedule.id}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                >
                  <Link
                    href={scheduleAdminHref(schedule, payment.athlete.id)}
                    className="min-w-0 hover:underline"
                  >
                    {describeScheduleAdmin(schedule)}
                  </Link>
                  <span className="shrink-0 font-mono">
                    {CURRENCY.format(schedule.amountCents / 100)}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      )}

      {payment.notes && (
        <div className="border-t pt-4">
          <h4 className="text-xs text-muted-foreground mb-1">Note</h4>
          <p className="text-sm whitespace-pre-wrap">{payment.notes}</p>
        </div>
      )}

      {isReversed && payment.reversalReason && (
        <div className="border-t pt-4">
          <h4 className="text-xs text-muted-foreground mb-1">
            Motivo storno
          </h4>
          <p className="text-sm whitespace-pre-wrap">{payment.reversalReason}</p>
        </div>
      )}
    </div>
  )
}
