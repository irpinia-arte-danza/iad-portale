"use server"

import { FeeType, PaymentMethod } from "@prisma/client"

import type { ActionResult } from "@/lib/schemas/common"

import {
  getCorrispettivi,
  type CorrispettiviResult,
} from "./queries"

const FEE_TYPES: FeeType[] = [
  "ASSOCIATION",
  "MONTHLY",
  "TRIMESTER",
  "STAGE",
  "SHOWCASE_1",
  "SHOWCASE_2",
  "COSTUME",
  "TRIAL_LESSON",
  "OTHER",
]

const METHODS: PaymentMethod[] = [
  "CASH",
  "TRANSFER",
  "POS",
  "SUMUP_LINK",
  "OTHER",
]

export interface CorrispettiviActionInput {
  from: string
  to: string
  feeType?: string
  method?: string
}

function parseDateBoundary(iso: string, endOfDay: boolean): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null
  const [y, m, d] = iso.split("-").map(Number)
  const date = new Date(y, m - 1, d, 0, 0, 0, 0)
  if (Number.isNaN(date.getTime())) return null
  if (endOfDay) date.setHours(23, 59, 59, 999)
  return date
}

export async function fetchCorrispettivi(
  input: CorrispettiviActionInput,
): Promise<ActionResult<{ result: CorrispettiviResult }>> {
  const from = parseDateBoundary(input.from, false)
  const to = parseDateBoundary(input.to, true)

  if (!from || !to) {
    return { ok: false, error: "Intervallo date non valido" }
  }
  if (from > to) {
    return {
      ok: false,
      error: "La data iniziale deve precedere quella finale",
    }
  }

  const feeType =
    input.feeType && FEE_TYPES.includes(input.feeType as FeeType)
      ? (input.feeType as FeeType)
      : undefined
  const method =
    input.method && METHODS.includes(input.method as PaymentMethod)
      ? (input.method as PaymentMethod)
      : undefined

  try {
    const result = await getCorrispettivi({ from, to, feeType, method })
    return { ok: true, data: { result } }
  } catch (error) {
    console.error("[corrispettivi action] fetch failed", error)
    return { ok: false, error: "Errore durante il caricamento" }
  }
}
