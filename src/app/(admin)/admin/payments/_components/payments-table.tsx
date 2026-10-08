"use client"

import Link from "next/link"
import { useState } from "react"

import {
  ResponsiveList,
  type ListColumn,
} from "@/components/lists/responsive-list"
import { Badge } from "@/components/ui/badge"
import {
  compareScheduleLines,
  describeScheduleAdmin,
  paymentFeeTypeLabel,
  paymentFeeTypeShortLabel,
} from "@/lib/payments/schedule-lines"
import { receiptPdfHref } from "@/lib/receipts/types"
import { PAYMENT_METHOD_LABELS } from "@/lib/schemas/payment"
import { formatDateShort, formatEuro } from "@/lib/utils/format"
import { fullName, listName } from "@/lib/utils/person-name"
import { cn } from "@/lib/utils"

import type { PaymentListItem } from "../queries"
import { PaymentDetailSheet } from "./payment-detail-sheet"
import { PaymentRowActions } from "./payment-row-actions"

interface PaymentsTableProps {
  payments: PaymentListItem[]
}

const MONTH_YEAR = new Intl.DateTimeFormat("it-IT", {
  month: "short",
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

function scheduleLines(p: PaymentListItem): string[] {
  return [...p.paymentSchedules]
    .sort(compareScheduleLines)
    .map(describeScheduleAdmin)
}

// Lo stato dice solo le eccezioni: su un elenco di pagamenti "Pagato" su
// ogni riga è rumore, e lo storno — che è la cosa da notare — si perdeva in
// mezzo. Riga vuota = incassato e a posto.
function statusBadge(p: PaymentListItem) {
  if (p.status === "PAID") return null
  return <Badge variant="destructive">Stornato</Badge>
}

function ReceiptCell({ p }: { p: PaymentListItem }) {
  const cancelled = p.receipt?.status === "CANCELLED"

  if (!p.receipt) {
    return (
      <span className="text-xs text-muted-foreground">
        {p.status === "PAID" ? "da emettere" : "—"}
      </span>
    )
  }

  return (
    <span className="flex min-w-0 flex-col">
      {/* Il numero apre la ricevuta: è il documento che la famiglia ha in
          mano, e da qui si controlla in un clic invece di cercarlo in
          Ricevute */}
      <a
        href={receiptPdfHref(p.receipt.id)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "truncate font-mono text-xs hover:underline",
          cancelled && "text-muted-foreground line-through",
        )}
      >
        {p.receipt.receiptNumber}
      </a>
      {cancelled ? (
        <span className="text-xs text-destructive">annullata</span>
      ) : null}
    </span>
  )
}

export function PaymentsTable({ payments }: PaymentsTableProps) {
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(
    null,
  )
  const [sheetOpen, setSheetOpen] = useState(false)

  function openDetailSheet(id: string) {
    setSelectedPaymentId(id)
    setSheetOpen(true)
  }

  // ── Colonne ─────────────────────────────────────────────────────────────
  // Alta (da 768): allieva, data, tipo, importo, ricevuta — chi ha pagato
  // cosa, quando e quanto, e se il documento è stato fatto. Data e tipo
  // erano da 1024: su iPad restava un vuoto al centro e mancava proprio la
  // data. Da 1280 metodo, periodo e scadenze coperte.
  // «Stato» parla solo per le eccezioni (lo storno): se nessuna riga a
  // schermo ne ha una, la colonna non c'è e lo spazio va al nome
  const anyException = payments.some((p) => statusBadge(p) !== null)

  const allColumns: ListColumn<PaymentListItem>[] = [
    {
      key: "allieva",
      header: "Allieva",
      width: "md:flex-1",
      cell: (p) => (
        <Link
          href={`/admin/athletes/${p.athlete.id}`}
          className="truncate font-medium hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {listName(p.athlete)}
        </Link>
      ),
    },
    {
      key: "data",
      header: "Data",
      width: "md:w-20 lg:w-24",
      cell: (p) => (
        <span className="font-mono text-xs">
          {formatDateShort(p.paymentDate)}
        </span>
      ),
    },
    {
      key: "tipo",
      header: "Tipo",
      width: "md:w-24 lg:w-40",
      cell: (p) => (
        // h-auto e whitespace-normal: il chip va a capo invece di tagliarsi
        // a metà altezza. Il testo intero resta nel title.
        <Badge
          variant="secondary"
          className="h-auto py-0.5 leading-snug whitespace-normal"
          title={paymentFeeTypeLabel(p)}
        >
          {paymentFeeTypeShortLabel(p)}
        </Badge>
      ),
    },
    {
      key: "importo",
      header: "Importo",
      width: "md:w-24 lg:w-28",
      align: "right",
      cell: (p) => (
        <span className="font-mono text-sm">{formatEuro(p.amountCents)}</span>
      ),
    },
    {
      key: "metodo",
      header: "Metodo",
      priority: "low",
      width: "md:w-24",
      cell: (p) => (
        <span className="truncate text-sm text-muted-foreground">
          {PAYMENT_METHOD_LABELS[p.method]}
        </span>
      ),
    },
    {
      key: "periodo",
      header: "Periodo",
      priority: "low",
      width: "md:w-32",
      cell: (p) => (
        <span className="truncate text-sm text-muted-foreground">
          {formatPeriod(p.periodStart, p.periodEnd) ?? "—"}
        </span>
      ),
    },
    {
      key: "scadenze",
      header: "Scadenze",
      priority: "low",
      width: "md:w-28",
      cell: (p) => {
        const lines = scheduleLines(p)
        return (
          <span
            className="truncate text-sm text-muted-foreground"
            title={lines.length > 0 ? lines.join("\n") : undefined}
          >
            {lines.length === 0
              ? "—"
              : lines.length === 1
                ? "1 scadenza"
                : `${lines.length} scadenze`}
          </span>
        )
      },
    },
    {
      key: "ricevuta",
      header: "Ricevuta",
      width: "md:w-32",
      cell: (p) => <ReceiptCell p={p} />,
    },
    {
      key: "stato",
      header: "Stato",
      width: "md:w-20 lg:w-24",
      cell: (p) => statusBadge(p),
    },
  ]
  const columns = anyException
    ? allColumns
    : allColumns.filter((column) => column.key !== "stato")

  return (
    <>
      <ResponsiveList
        label="Pagamenti"
        items={payments}
        getId={(p) => p.id}
        columns={columns}
        onRowClick={(p) => openDetailSheet(p.id)}
        empty={{
          title: "Nessun pagamento trovato",
          hint: "Modifica i filtri oppure registra il primo pagamento.",
        }}
        // Le due righe della card: quanto è entrato (con data, metodo e
        // causale) e se la ricevuta è stata fatta. Lo storno compare solo
        // quando c'è.
        cardLines={(p) => [
          <span key="importo" className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-sm font-medium text-foreground">
              {formatEuro(p.amountCents)}
            </span>
            <span>
              · {formatDateShort(p.paymentDate)} ·{" "}
              {PAYMENT_METHOD_LABELS[p.method]} · {paymentFeeTypeShortLabel(p)}
            </span>
            {statusBadge(p)}
          </span>,
          <span key="ricevuta" className="flex items-center gap-1.5">
            Ricevuta: <ReceiptCell p={p} />
          </span>,
        ]}
        actions={(p) => (
          <PaymentRowActions
            layout="responsive"
            payment={{
              id: p.id,
              status: p.status,
              notes: p.notes,
              // Nei dialog si parla di una persona ("il pagamento di Maria
              // Rossi"), non si cerca in un elenco
              athleteName: fullName(p.athlete),
              receipt: p.receipt,
              scheduleDescriptions: scheduleLines(p),
            }}
          />
        )}
      />

      <PaymentDetailSheet
        paymentId={selectedPaymentId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  )
}
