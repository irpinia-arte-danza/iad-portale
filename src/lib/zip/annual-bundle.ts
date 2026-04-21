import { renderToBuffer } from "@react-pdf/renderer"
import JSZip from "jszip"

import { getBilancio } from "@/app/(admin)/admin/reports/bilancio/queries"
import { getCorrispettivi } from "@/app/(admin)/admin/reports/corrispettivi/queries"
import {
  getFiscalYearByYear,
  getSpese,
} from "@/app/(admin)/admin/reports/annuale/queries"
import { BilancioPDF } from "@/lib/pdf/components/bilancio-pdf"
import { EXPENSE_TYPE_LABELS } from "@/lib/schemas/expense"
import { FEE_TYPE_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/schemas/payment"
import { buildXlsxBuffer, type XlsxSheet } from "@/lib/utils/excel"
import { formatDateShort } from "@/lib/utils/format"

import type { CorrispettiviResult } from "@/app/(admin)/admin/reports/corrispettivi/queries"
import type { SpeseResult } from "@/app/(admin)/admin/reports/annuale/queries"

function eur(cents: number): number {
  return Number((cents / 100).toFixed(2))
}

const CORRISPETTIVI_HEADERS = [
  "Data",
  "Allieva",
  "Tipo quota",
  "Corso",
  "Metodo",
  "Importo (€)",
]

const SPESE_HEADERS = [
  "Data",
  "Tipologia",
  "Fornitore",
  "Causale",
  "Metodo",
  "Importo (€)",
]

function buildCorrispettiviSheets(result: CorrispettiviResult): XlsxSheet[] {
  const flat: unknown[][] = []
  const subtotals: unknown[][] = []

  for (const day of result.days) {
    for (const p of day.items) {
      flat.push([
        formatDateShort(p.paymentDate),
        `${p.athlete.lastName} ${p.athlete.firstName}`,
        FEE_TYPE_LABELS[p.feeType],
        p.courseEnrollment?.course.name ?? "",
        PAYMENT_METHOD_LABELS[p.method],
        eur(p.amountCents),
      ])
    }
    subtotals.push([
      formatDateShort(day.date),
      "Subtotale giornaliero",
      eur(day.subtotalCents),
    ])
  }

  subtotals.push([])
  subtotals.push(["Totale periodo", "", eur(result.totals.grandTotalCents)])
  subtotals.push([])
  subtotals.push(["Metodo", "Nr. pagamenti", "Totale (€)"])
  for (const [method, entry] of Object.entries(result.totals.byMethod)) {
    if (entry.count === 0) continue
    subtotals.push([
      PAYMENT_METHOD_LABELS[method as keyof typeof PAYMENT_METHOD_LABELS],
      entry.count,
      eur(entry.totalCents),
    ])
  }

  subtotals.push([])
  subtotals.push(["Tipologia", "Nr. pagamenti", "Totale (€)"])
  for (const [feeType, entry] of Object.entries(result.totals.byFeeType)) {
    subtotals.push([
      FEE_TYPE_LABELS[feeType as keyof typeof FEE_TYPE_LABELS] ?? feeType,
      entry.count,
      eur(entry.totalCents),
    ])
  }

  return [
    {
      name: "Corrispettivi",
      headers: CORRISPETTIVI_HEADERS,
      rows: flat,
      columnWidths: [12, 28, 22, 28, 12, 14],
    },
    {
      name: "Subtotali",
      headers: ["Giorno", "Voce", "Importo (€)"],
      rows: subtotals,
      columnWidths: [14, 28, 14],
    },
  ]
}

function buildSpeseSheets(result: SpeseResult): XlsxSheet[] {
  const flat: unknown[][] = result.items.map((s) => [
    formatDateShort(s.expenseDate),
    EXPENSE_TYPE_LABELS[s.type],
    s.recipient ?? "",
    s.description,
    PAYMENT_METHOD_LABELS[s.method],
    eur(s.amountCents),
  ])

  const subtotals: unknown[][] = []
  subtotals.push(["Totale periodo", "", eur(result.totals.grandTotalCents)])
  subtotals.push([])
  subtotals.push(["Metodo", "Nr. spese", "Totale (€)"])
  for (const [method, entry] of Object.entries(result.totals.byMethod)) {
    if (entry.count === 0) continue
    subtotals.push([
      PAYMENT_METHOD_LABELS[method as keyof typeof PAYMENT_METHOD_LABELS],
      entry.count,
      eur(entry.totalCents),
    ])
  }
  subtotals.push([])
  subtotals.push(["Tipologia", "Nr. spese", "Totale (€)"])
  for (const [type, entry] of Object.entries(result.totals.byType)) {
    subtotals.push([
      EXPENSE_TYPE_LABELS[type as keyof typeof EXPENSE_TYPE_LABELS] ?? type,
      entry.count,
      eur(entry.totalCents),
    ])
  }

  return [
    {
      name: "Spese",
      headers: SPESE_HEADERS,
      rows: flat,
      columnWidths: [12, 22, 26, 40, 12, 14],
    },
    {
      name: "Subtotali",
      headers: ["Voce", "Nr.", "Totale (€)"],
      rows: subtotals,
      columnWidths: [26, 10, 14],
    },
  ]
}

export type AnnualBundleResult = {
  buffer: Buffer
  filename: string
}

export async function generateAnnualBundle(
  year: number,
): Promise<AnnualBundleResult> {
  const fiscalYear = await getFiscalYearByYear(year)
  if (!fiscalYear) {
    throw new Error(`Anno fiscale ${year} non trovato`)
  }

  const from = new Date(fiscalYear.startDate)
  from.setHours(0, 0, 0, 0)
  const to = new Date(fiscalYear.endDate)
  to.setHours(23, 59, 59, 999)

  const [corrispettivi, spese, bilancio] = await Promise.all([
    getCorrispettivi({ from, to }),
    getSpese({ from, to }),
    getBilancio({ from, to }),
  ])

  const corrispettiviBuffer = buildXlsxBuffer(
    buildCorrispettiviSheets(corrispettivi),
  )
  const speseBuffer = buildXlsxBuffer(buildSpeseSheets(spese))

  const bilancioBuffer = await renderToBuffer(
    BilancioPDF({
      year,
      periodFrom: from,
      periodTo: to,
      data: bilancio,
    }),
  )

  const zip = new JSZip()
  zip.file(`01_Corrispettivi_${year}.xlsx`, corrispettiviBuffer)
  zip.file(`02_Spese_${year}.xlsx`, speseBuffer)
  zip.file(`03_Bilancio_${year}.pdf`, bilancioBuffer)

  const buffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  })

  return {
    buffer,
    filename: `IAD_Export_Annuale_${year}.zip`,
  }
}
