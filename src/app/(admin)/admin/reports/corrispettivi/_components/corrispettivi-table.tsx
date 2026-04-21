import { Fragment } from "react"

import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { FEE_TYPE_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/schemas/payment"
import { formatDateLong, formatEur } from "@/lib/utils/format"

import type {
  CorrispettiviDayGroup,
  CorrispettiviTotals,
} from "../queries"

interface CorrispettiviTableProps {
  days: CorrispettiviDayGroup[]
  totals: CorrispettiviTotals
}

const METHOD_ORDER = ["CASH", "TRANSFER", "POS", "SUMUP_LINK", "OTHER"] as const

export function CorrispettiviTable({
  days,
  totals,
}: CorrispettiviTableProps) {
  if (days.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <h3 className="text-sm font-medium">
          Nessun pagamento nel periodo selezionato
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Modifica l&apos;intervallo date o rimuovi i filtri.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Allieva</TableHead>
              <TableHead>Tipo quota</TableHead>
              <TableHead className="hidden md:table-cell">Corso</TableHead>
              <TableHead className="hidden sm:table-cell">Metodo</TableHead>
              <TableHead className="text-right">Importo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {days.map((day) => (
              <Fragment key={day.dayKey}>
                <TableRow
                  className="bg-muted/50 hover:bg-muted/50"
                >
                  <TableCell
                    colSpan={5}
                    className="font-semibold capitalize"
                  >
                    {formatDateLong(day.date)}
                  </TableCell>
                </TableRow>
                {day.items.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {p.athlete.lastName} {p.athlete.firstName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {FEE_TYPE_LABELS[p.feeType]}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {p.courseEnrollment?.course.name ?? "—"}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {PAYMENT_METHOD_LABELS[p.method]}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatEur(p.amountCents)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow
                  className="border-t-2 hover:bg-transparent"
                >
                  <TableCell
                    colSpan={4}
                    className="text-right text-sm font-medium text-muted-foreground"
                  >
                    Subtotale giornaliero
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold">
                    {formatEur(day.subtotalCents)}
                  </TableCell>
                </TableRow>
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="rounded-lg border bg-accent/30 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Totale periodo
            </p>
            <p className="mt-1 font-mono text-2xl font-semibold">
              {formatEur(totals.grandTotalCents)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {totals.countItems}{" "}
              {totals.countItems === 1 ? "pagamento" : "pagamenti"} su{" "}
              {totals.countDays}{" "}
              {totals.countDays === 1 ? "giornata" : "giornate"}
            </p>
          </div>

          <div className="flex flex-col gap-1 text-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Per metodo
            </p>
            {METHOD_ORDER.map((method) => {
              const entry = totals.byMethod[method]
              if (entry.count === 0) return null
              return (
                <div
                  key={method}
                  className="flex items-center justify-between gap-6"
                >
                  <span className="text-muted-foreground">
                    {PAYMENT_METHOD_LABELS[method]}
                  </span>
                  <span className="font-mono font-medium">
                    {formatEur(entry.totalCents)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
