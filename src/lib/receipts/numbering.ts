import { ReceiptCategory, type FeeType } from "@prisma/client"

import { todayDateOnly } from "@/lib/utils/date-only"

// Numerazione ricevute: {prefisso}{anno accademico compatto}/{progressivo}{suffisso}
//   quote        → IAD/2026-27/001
//   saggio       → IAD/2026-27/045/S
//   costume      → IAD/2026-27/004/C
// Il progressivo viene dal contatore unico in Impostazioni → Ricevute.

export function feeTypeToReceiptCategory(feeType: FeeType): ReceiptCategory {
  if (feeType === "SHOWCASE_1" || feeType === "SHOWCASE_2") {
    return ReceiptCategory.SHOWCASE
  }
  if (feeType === "COSTUME") return ReceiptCategory.COSTUME
  return ReceiptCategory.REGULAR
}

export function receiptCategorySuffix(category: ReceiptCategory): string {
  if (category === ReceiptCategory.SHOWCASE) return "/S"
  if (category === ReceiptCategory.COSTUME) return "/C"
  return ""
}

// "2025-2026" → "2025-26"
export function compactAcademicYear(label: string): string {
  const parts = label.split("-")
  if (parts.length !== 2) return label
  const [start, end] = parts
  return `${start}-${end.slice(-2)}`
}

export function formatReceiptNumber(params: {
  prefix: string
  academicYearLabel: string
  sequence: number
  category: ReceiptCategory
}): string {
  const progressive = String(params.sequence).padStart(3, "0")
  return `${params.prefix}${compactAcademicYear(params.academicYearLabel)}/${progressive}${receiptCategorySuffix(params.category)}`
}

// Giorno di calendario a Roma, come Date a mezzanotte UTC (colonne @db.Date).
// Senza, un'emissione alle 00:30 di Roma finirebbe sul giorno precedente.
export function todayInRome(now: Date = new Date()): Date {
  return todayDateOnly(now)
}
