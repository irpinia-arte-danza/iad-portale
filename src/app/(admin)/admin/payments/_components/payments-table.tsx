"use client"

import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  FEE_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
} from "@/lib/schemas/payment"

import type { PaymentListItem } from "../queries"
import { PaymentRowActions } from "./payment-row-actions"

interface PaymentsTableProps {
  payments: PaymentListItem[]
}

const CURRENCY = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
})

const DATE_SHORT = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

const MONTH_YEAR = new Intl.DateTimeFormat("it-IT", {
  month: "short",
  year: "numeric",
})

function formatPeriod(
  start: Date | null,
  end: Date | null,
): string | null {
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

export function PaymentsTable({ payments }: PaymentsTableProps) {
  if (payments.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <h3 className="text-sm font-medium">Nessun pagamento trovato</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Modifica i filtri oppure registra il primo pagamento.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Allieva</TableHead>
            <TableHead className="hidden sm:table-cell">Tipo</TableHead>
            <TableHead className="text-right">Importo</TableHead>
            <TableHead className="hidden md:table-cell">Metodo</TableHead>
            <TableHead className="hidden lg:table-cell">Periodo</TableHead>
            <TableHead>Stato</TableHead>
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((p) => {
            const period = formatPeriod(p.periodStart, p.periodEnd)
            return (
              <TableRow key={p.id} className="hover:bg-muted/50">
                <TableCell className="font-mono text-xs">
                  {DATE_SHORT.format(p.paymentDate)}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/admin/athletes/${p.athlete.id}`}
                    className="font-medium hover:underline"
                  >
                    {p.athlete.lastName} {p.athlete.firstName}
                  </Link>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge variant="secondary">
                    {FEE_TYPE_LABELS[p.feeType]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {CURRENCY.format(p.amountCents / 100)}
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                  {PAYMENT_METHOD_LABELS[p.method]}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                  {period ?? "—"}
                </TableCell>
                <TableCell>
                  {p.status === "PAID" ? (
                    <Badge className="bg-emerald-600 hover:bg-emerald-600">
                      Pagato
                    </Badge>
                  ) : (
                    <Badge variant="destructive">Stornato</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <PaymentRowActions
                    payment={{
                      id: p.id,
                      status: p.status,
                      notes: p.notes,
                      athleteName: `${p.athlete.firstName} ${p.athlete.lastName}`,
                    }}
                  />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
