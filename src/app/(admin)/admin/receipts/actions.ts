"use server"

import { revalidatePath } from "next/cache"

import { requireAdmin } from "@/lib/auth/require-admin"
import {
  buildIssuePreview,
  issueReceiptCore,
} from "@/lib/receipts/issue-receipt"
import type {
  IssueReceiptResult,
  ReceiptIssuePreview,
} from "@/lib/receipts/types"
import { uuidSchema } from "@/lib/schemas/common"

// Anteprima prima dell'emissione: intestatario scelto e dati mancanti, così
// l'admin vede cosa verrà congelato sulla ricevuta prima che nasca il numero.
export async function getReceiptIssuePreview(
  paymentId: string,
): Promise<
  { ok: true; preview: ReceiptIssuePreview } | { ok: false; error: string }
> {
  await requireAdmin()

  const idParsed = uuidSchema.safeParse(paymentId)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo pagamento non valido" }
  }

  const preview = await buildIssuePreview(idParsed.data)
  if (!preview) return { ok: false, error: "Pagamento non trovato" }
  return { ok: true, preview }
}

// "Emetti ricevuta": unico punto in cui nasce un numero di ricevuta.
// Idempotente: su un pagamento che ha già la ricevuta restituisce quella.
export async function issueReceipt(
  paymentId: string,
): Promise<IssueReceiptResult> {
  const { userId } = await requireAdmin()

  const idParsed = uuidSchema.safeParse(paymentId)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo pagamento non valido" }
  }

  const result = await issueReceiptCore({
    paymentId: idParsed.data,
    adminUserId: userId,
  })

  if (result.ok && !result.alreadyIssued) {
    revalidatePath("/admin/payments")
    revalidatePath("/admin/receipts")
  }
  return result
}
