"use server"

import { revalidatePath } from "next/cache"

import { requireAdmin } from "@/lib/auth/require-admin"
import {
  buildIssuePreview,
  issueReceiptCore,
} from "@/lib/receipts/issue-receipt"
import { getReceiptEmailState } from "@/lib/receipts/receipt-email-status"
import type { ReceiptEmailState } from "@/lib/receipts/receipt-email"
import {
  sendReceiptEmailCore,
  type SendReceiptEmailResult,
} from "@/lib/receipts/send-receipt-email"
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

// "Invia per email" / "Invia di nuovo": manda la ricevuta al pagante congelato
// sul documento, con il PDF archiviato in allegato. skipRevalidate per l'invio
// multiplo, che aggiorna la pagina una sola volta alla fine.
export async function sendReceiptByEmail(
  receiptId: string,
  options?: { skipRevalidate?: boolean },
): Promise<SendReceiptEmailResult> {
  const { userId } = await requireAdmin()

  const idParsed = uuidSchema.safeParse(receiptId)
  if (!idParsed.success) {
    return {
      ok: false,
      code: "NOT_FOUND",
      error: "Identificativo ricevuta non valido",
    }
  }

  const result = await sendReceiptEmailCore({
    receiptId: idParsed.data,
    adminUserId: userId,
  })

  if (result.ok && !options?.skipRevalidate) {
    revalidatePath("/admin/receipts")
    revalidatePath("/admin/payments")
  }
  return result
}

// Stato dell'invio per il pannello del pagamento, che carica la ricevuta a
// parte rispetto all'elenco.
export async function getReceiptEmailInfo(
  receiptId: string,
): Promise<ReceiptEmailState | null> {
  await requireAdmin()

  const idParsed = uuidSchema.safeParse(receiptId)
  if (!idParsed.success) return null

  return getReceiptEmailState(idParsed.data)
}
