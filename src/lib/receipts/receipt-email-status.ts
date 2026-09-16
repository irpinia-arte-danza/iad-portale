import "server-only"

import { EmailStatus } from "@prisma/client"

import { prisma } from "@/lib/prisma"

import {
  NEVER_SENT,
  RECEIPT_EMAIL_TEMPLATE_SLUG,
  type ReceiptEmailState,
} from "./receipt-email"

// ─────────────────────────────────────────────────────────────────────────
// Stato dell'invio ricavato da EmailLog, senza campi nuovi su receipts —
// stesso schema dello stato accesso dei genitori (access-status.ts).
//
// Conta solo gli invii accettati dal provider: una riga FAILED è un tentativo
// non andato a buon fine, e la ricevuta resta "non inviata".
// ─────────────────────────────────────────────────────────────────────────

export async function getReceiptEmailStates(
  receiptIds: string[],
): Promise<Record<string, ReceiptEmailState>> {
  if (receiptIds.length === 0) return {}

  const logs = await prisma.emailLog.findMany({
    where: {
      receiptId: { in: receiptIds },
      templateSlug: RECEIPT_EMAIL_TEMPLATE_SLUG,
      status: { not: EmailStatus.FAILED },
    },
    select: { receiptId: true, recipientEmail: true, sentAt: true },
    orderBy: { sentAt: "desc" },
  })

  const states: Record<string, ReceiptEmailState> = {}
  for (const log of logs) {
    if (!log.receiptId) continue
    const current = states[log.receiptId]
    if (current) {
      states[log.receiptId] = { ...current, sendCount: current.sendCount + 1 }
      continue
    }
    // Il primo che si incontra è il più recente (ordine per sentAt desc)
    states[log.receiptId] = {
      lastSentAt: log.sentAt,
      lastRecipient: log.recipientEmail,
      sendCount: 1,
    }
  }

  for (const id of receiptIds) {
    if (!states[id]) states[id] = NEVER_SENT
  }
  return states
}

export async function getReceiptEmailState(
  receiptId: string,
): Promise<ReceiptEmailState> {
  const states = await getReceiptEmailStates([receiptId])
  return states[receiptId] ?? NEVER_SENT
}

// Storico completo degli invii di una ricevuta, per il dettaglio: la
// ripetizione è permessa e deve restare visibile, tentativi falliti compresi.
export async function getReceiptEmailHistory(receiptId: string) {
  return prisma.emailLog.findMany({
    where: { receiptId },
    select: {
      id: true,
      sentAt: true,
      recipientEmail: true,
      status: true,
      errorMessage: true,
      sentByUser: { select: { firstName: true, lastName: true } },
    },
    orderBy: { sentAt: "desc" },
  })
}
