import "server-only"

import { AuditAction, EmailStatus, ReceiptStatus } from "@prisma/client"

import { prisma } from "@/lib/prisma"

import { deliveryState, isToDeliver, type DeliveryState } from "./delivery"
import { RECEIPT_EMAIL_TEMPLATE_SLUG } from "./receipt-email"

// ─────────────────────────────────────────────────────────────────────────
// Lo stato di consegna letto dalle tre fonti, senza campi nuovi su receipts:
// EmailLog per gli invii, AuditLog per le condivisioni e per le consegne a
// mano. Stesso principio dello stato di invio (receipt-email-status.ts).
// ─────────────────────────────────────────────────────────────────────────

const DELIVERY_ACTIONS = [
  AuditAction.RECEIPT_SHARED,
  AuditAction.RECEIPT_DELIVERED_BY_HAND,
]

type Traces = {
  email: Map<string, Date>
  share: Map<string, Date>
  hand: Map<string, Date>
}

async function loadTraces(receiptIds: string[]): Promise<Traces> {
  const empty: Traces = { email: new Map(), share: new Map(), hand: new Map() }
  if (receiptIds.length === 0) return empty

  const [emails, audits] = await Promise.all([
    prisma.emailLog.findMany({
      where: {
        receiptId: { in: receiptIds },
        templateSlug: RECEIPT_EMAIL_TEMPLATE_SLUG,
        status: { not: EmailStatus.FAILED },
      },
      select: { receiptId: true, sentAt: true },
      orderBy: { sentAt: "desc" },
    }),
    prisma.auditLog.findMany({
      where: {
        action: { in: DELIVERY_ACTIONS },
        entityType: "Receipt",
        entityId: { in: receiptIds },
      },
      select: { entityId: true, action: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ])

  const traces = empty
  for (const log of emails) {
    if (!log.receiptId || traces.email.has(log.receiptId)) continue
    traces.email.set(log.receiptId, log.sentAt)
  }
  for (const row of audits) {
    if (!row.entityId) continue
    const target =
      row.action === AuditAction.RECEIPT_SHARED ? traces.share : traces.hand
    if (target.has(row.entityId)) continue
    target.set(row.entityId, row.createdAt)
  }
  return traces
}

export async function getDeliveryStates(
  receipts: { id: string; status: ReceiptStatus }[],
): Promise<Record<string, DeliveryState>> {
  const traces = await loadTraces(receipts.map((r) => r.id))

  const states: Record<string, DeliveryState> = {}
  for (const receipt of receipts) {
    states[receipt.id] = deliveryState({
      status: receipt.status,
      emailSentAt: traces.email.get(receipt.id) ?? null,
      sharedAt: traces.share.get(receipt.id) ?? null,
      handDeliveredAt: traces.hand.get(receipt.id) ?? null,
    })
  }
  return states
}

export async function getDeliveryState(
  receipt: { id: string; status: ReceiptStatus },
): Promise<DeliveryState> {
  const states = await getDeliveryStates([receipt])
  return states[receipt.id]
}

/**
 * Quante ricevute aspettano di arrivare alla famiglia.
 *
 * Tre query che leggono solo identificatori e date, non le ricevute intere:
 * costa come gli altri contatori. Lo usano il chip dell'elenco, il riquadro
 * della dashboard e (quando arriverà) il contatore del menu.
 */
export async function countReceiptsToDeliver(year?: number): Promise<number> {
  const where = {
    status: { not: ReceiptStatus.CANCELLED },
    ...(year !== undefined
      ? {
          issueDate: {
            gte: new Date(Date.UTC(year, 0, 1)),
            lt: new Date(Date.UTC(year + 1, 0, 1)),
          },
        }
      : {}),
  }

  const receipts = await prisma.receipt.findMany({
    where,
    select: { id: true },
  })
  if (receipts.length === 0) return 0

  const ids = receipts.map((r) => r.id)
  const [emailed, audited] = await Promise.all([
    prisma.emailLog.findMany({
      where: {
        receiptId: { in: ids },
        templateSlug: RECEIPT_EMAIL_TEMPLATE_SLUG,
        status: { not: EmailStatus.FAILED },
      },
      select: { receiptId: true },
      distinct: ["receiptId"],
    }),
    prisma.auditLog.findMany({
      where: {
        action: { in: DELIVERY_ACTIONS },
        entityType: "Receipt",
        entityId: { in: ids },
      },
      select: { entityId: true },
      distinct: ["entityId"],
    }),
  ])

  const delivered = new Set<string>()
  for (const row of emailed) if (row.receiptId) delivered.add(row.receiptId)
  for (const row of audited) if (row.entityId) delivered.add(row.entityId)

  return ids.filter((id) => !delivered.has(id)).length
}

// Comodo per i test e per chi ha già gli stati in mano
export { isToDeliver }
