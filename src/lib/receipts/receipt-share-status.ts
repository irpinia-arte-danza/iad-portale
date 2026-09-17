import "server-only"

import { AuditAction } from "@prisma/client"

import { prisma } from "@/lib/prisma"

import { NEVER_SHARED, type ReceiptShareState } from "./receipt-share"

// Stato della condivisione da AuditLog: nessun campo nuovo su receipts,
// stesso principio dello stato di invio ricavato da EmailLog.
export async function getReceiptShareState(
  receiptId: string,
): Promise<ReceiptShareState> {
  const rows = await prisma.auditLog.findMany({
    where: {
      action: AuditAction.RECEIPT_SHARED,
      entityType: "Receipt",
      entityId: receiptId,
    },
    select: { createdAt: true },
    orderBy: { createdAt: "desc" },
  })

  if (rows.length === 0) return NEVER_SHARED
  return { lastSharedAt: rows[0].createdAt, shareCount: rows.length }
}
