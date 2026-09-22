import { ReceiptCategory, type FeeType } from "@prisma/client"

import { todayDateOnly } from "@/lib/utils/date-only"

// Categoria della ricevuta e giornata di emissione. La composizione del
// numero vive in numbering-config.ts, che è puro e gira anche nel browser.

export function feeTypeToReceiptCategory(feeType: FeeType): ReceiptCategory {
  if (feeType === "SHOWCASE_1" || feeType === "SHOWCASE_2") {
    return ReceiptCategory.SHOWCASE
  }
  if (feeType === "COSTUME") return ReceiptCategory.COSTUME
  return ReceiptCategory.REGULAR
}

// Giorno di calendario a Roma, come Date a mezzanotte UTC (colonne @db.Date).
// Senza, un'emissione alle 00:30 di Roma finirebbe sul giorno precedente —
// e col riavvio annuale finirebbe anche nel periodo sbagliato.
export function todayInRome(now: Date = new Date()): Date {
  return todayDateOnly(now)
}
