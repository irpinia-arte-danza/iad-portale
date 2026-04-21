"use client"

import { useTransition } from "react"
import { Download, FileSpreadsheet, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { FEE_TYPE_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/schemas/payment"
import { generateCSV } from "@/lib/utils/csv"
import { generateXLSX } from "@/lib/utils/excel"
import { formatDateShort } from "@/lib/utils/format"

import { fetchCorrispettivi } from "../actions"
import type { CorrispettiviResult } from "../queries"

interface CorrispettiviExportButtonsProps {
  from: string
  to: string
  feeType?: string
  method?: string
  hasData: boolean
}

const CSV_HEADERS = [
  "Data",
  "Allieva",
  "Tipo quota",
  "Corso",
  "Metodo",
  "Importo (€)",
]

function buildFilename(
  ext: "csv" | "xlsx",
  from: string,
  to: string,
): string {
  return `corrispettivi_${from}_${to}.${ext}`
}

function buildRows(
  result: CorrispettiviResult,
): { csv: unknown[][]; flatXlsx: unknown[][]; subtotals: unknown[][] } {
  const csv: unknown[][] = []
  const flatXlsx: unknown[][] = []
  const subtotals: unknown[][] = []

  for (const day of result.days) {
    for (const p of day.items) {
      const row: unknown[] = [
        formatDateShort(p.paymentDate),
        `${p.athlete.lastName} ${p.athlete.firstName}`,
        FEE_TYPE_LABELS[p.feeType],
        p.courseEnrollment?.course.name ?? "",
        PAYMENT_METHOD_LABELS[p.method],
        (p.amountCents / 100).toFixed(2).replace(".", ","),
      ]
      csv.push(row)
      flatXlsx.push([
        formatDateShort(p.paymentDate),
        `${p.athlete.lastName} ${p.athlete.firstName}`,
        FEE_TYPE_LABELS[p.feeType],
        p.courseEnrollment?.course.name ?? "",
        PAYMENT_METHOD_LABELS[p.method],
        Number((p.amountCents / 100).toFixed(2)),
      ])
    }
    subtotals.push([
      formatDateShort(day.date),
      "Subtotale giornaliero",
      Number((day.subtotalCents / 100).toFixed(2)),
    ])
  }

  subtotals.push([])
  subtotals.push([
    "Totale periodo",
    "",
    Number((result.totals.grandTotalCents / 100).toFixed(2)),
  ])
  subtotals.push([])
  subtotals.push(["Metodo", "Nr. pagamenti", "Totale (€)"])
  for (const [method, entry] of Object.entries(result.totals.byMethod)) {
    if (entry.count === 0) continue
    subtotals.push([
      PAYMENT_METHOD_LABELS[method as keyof typeof PAYMENT_METHOD_LABELS],
      entry.count,
      Number((entry.totalCents / 100).toFixed(2)),
    ])
  }

  return { csv, flatXlsx, subtotals }
}

export function CorrispettiviExportButtons({
  from,
  to,
  feeType,
  method,
  hasData,
}: CorrispettiviExportButtonsProps) {
  const [isPending, startTransition] = useTransition()

  function runExport(format: "csv" | "xlsx") {
    startTransition(async () => {
      const action = await fetchCorrispettivi({ from, to, feeType, method })
      if (!action.ok || !action.data) {
        toast.error(action.ok ? "Nessun dato" : action.error)
        return
      }
      const result = action.data.result
      if (result.items.length === 0) {
        toast.error("Nessun pagamento da esportare nel periodo")
        return
      }

      const { csv, flatXlsx, subtotals } = buildRows(result)

      if (format === "csv") {
        generateCSV(CSV_HEADERS, csv, buildFilename("csv", from, to))
        toast.success("CSV scaricato")
      } else {
        generateXLSX(
          [
            {
              name: "Corrispettivi",
              headers: CSV_HEADERS,
              rows: flatXlsx,
              columnWidths: [12, 28, 22, 28, 12, 14],
            },
            {
              name: "Subtotali",
              headers: ["Giorno", "Voce", "Importo (€)"],
              rows: subtotals,
              columnWidths: [14, 28, 14],
            },
          ],
          buildFilename("xlsx", from, to),
        )
        toast.success("Excel scaricato")
      }
    })
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!hasData || isPending}
        onClick={() => runExport("csv")}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        CSV
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!hasData || isPending}
        onClick={() => runExport("xlsx")}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileSpreadsheet className="h-4 w-4" />
        )}
        Excel
      </Button>
    </div>
  )
}
