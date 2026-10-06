"use server"

import { revalidatePath } from "next/cache"

import { AuditAction } from "@prisma/client"

import { requireAdmin } from "@/lib/auth/require-admin"
import {
  buildIssuePreview,
  issueReceiptCore,
} from "@/lib/receipts/issue-receipt"
import { getReceiptEmailState } from "@/lib/receipts/receipt-email-status"
import type { ReceiptEmailState } from "@/lib/receipts/receipt-email"
import type { ReceiptShareState } from "@/lib/receipts/receipt-share"
import { getReceiptShareState } from "@/lib/receipts/receipt-share-status"
import { prisma } from "@/lib/prisma"
import {
  sendReceiptEmailCore,
  type SendReceiptEmailResult,
} from "@/lib/receipts/send-receipt-email"
import type {
  IssueReceiptResult,
  ReceiptIssuePreview,
} from "@/lib/receipts/types"
import { uuidSchema, type ActionResult } from "@/lib/schemas/common"

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

export type ReceiptDeliveryInfo = {
  email: ReceiptEmailState
  share: ReceiptShareState
  // Consegnata a mano: data dell'ultima volta che è stata segnata
  handDeliveredAt: Date | null
}

// Come la ricevuta è uscita dal gestionale: per email (si sa a chi) e per
// condivisione (si sa solo quando). Per il pannello del pagamento, che carica
// la ricevuta a parte rispetto all'elenco.
export async function getReceiptDeliveryInfo(
  receiptId: string,
): Promise<ReceiptDeliveryInfo | null> {
  await requireAdmin()

  const idParsed = uuidSchema.safeParse(receiptId)
  if (!idParsed.success) return null

  const [email, share, hand] = await Promise.all([
    getReceiptEmailState(idParsed.data),
    getReceiptShareState(idParsed.data),
    prisma.auditLog.findFirst({
      where: {
        action: AuditAction.RECEIPT_DELIVERED_BY_HAND,
        entityType: "Receipt",
        entityId: idParsed.data,
      },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ])
  return { email, share, handDeliveredAt: hand?.createdAt ?? null }
}

/**
 * "Consegnata a mano": stampata e data allo sportello.
 *
 * Come la condivisione, registra che il documento è uscito dal gestionale e
 * quando — qui però lo dichiara Giuseppina, perché il passaggio di mano il
 * portale non può vederlo. Serve soprattutto alle ricevute senza email, che
 * altrimenti resterebbero per sempre fra quelle da consegnare.
 */
export async function markReceiptDeliveredByHand(
  receiptId: string,
): Promise<ActionResult> {
  const { userId } = await requireAdmin()

  const idParsed = uuidSchema.safeParse(receiptId)
  if (!idParsed.success) return { ok: false, error: "Ricevuta non valida" }

  const receipt = await prisma.receipt.findUnique({
    where: { id: idParsed.data },
    select: { receiptNumber: true, status: true },
  })
  if (!receipt) return { ok: false, error: "Ricevuta non trovata" }
  if (receipt.status === "CANCELLED") {
    return {
      ok: false,
      error: "La ricevuta è annullata: non c'è niente da consegnare.",
    }
  }

  await prisma.auditLog.create({
    data: {
      userId,
      action: AuditAction.RECEIPT_DELIVERED_BY_HAND,
      entityType: "Receipt",
      entityId: idParsed.data,
      changes: { receiptNumber: receipt.receiptNumber },
    },
  })

  revalidatePath("/admin/receipts")
  revalidatePath("/admin/dashboard")
  return { ok: true }
}

// Traccia una condivisione riuscita dal foglio di iOS. Registra che il
// documento è uscito dal gestionale e quando: il destinatario si sceglie
// fuori dalla pagina e non è visibile da qui, quindi non finisce in EmailLog.
// Non restituisce errori all'interfaccia: se la traccia non si scrive, la
// condivisione è comunque avvenuta e bloccare l'utente non servirebbe.
export async function recordReceiptShared(receiptId: string): Promise<void> {
  const { userId } = await requireAdmin()

  const idParsed = uuidSchema.safeParse(receiptId)
  if (!idParsed.success) return

  const receipt = await prisma.receipt.findUnique({
    where: { id: idParsed.data },
    select: { receiptNumber: true },
  })
  if (!receipt) return

  await prisma.auditLog.create({
    data: {
      userId,
      action: AuditAction.RECEIPT_SHARED,
      entityType: "Receipt",
      entityId: idParsed.data,
      changes: { receiptNumber: receipt.receiptNumber },
    },
  })
}
