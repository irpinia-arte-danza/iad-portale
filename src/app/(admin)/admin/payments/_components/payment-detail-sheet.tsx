"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import {
  FEE_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
} from "@/lib/schemas/payment"

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
  }, [open, paymentId, onOpenChange])

  return (
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
            <PaymentDetailBody payment={payment} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function PaymentDetailBody({ payment }: { payment: PaymentWithRelations }) {
  const period = formatPeriod(payment.periodStart, payment.periodEnd)
  const isReversed = payment.status === "REVERSED"

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {isReversed ? (
          <Badge variant="destructive">Stornato</Badge>
        ) : (
          <Badge className="bg-emerald-600 hover:bg-emerald-600">Pagato</Badge>
        )}
        <Badge variant="secondary">{FEE_TYPE_LABELS[payment.feeType]}</Badge>
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
