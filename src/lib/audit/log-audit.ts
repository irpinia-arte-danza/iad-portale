import "server-only"

import type { AuditAction, Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"

// ─────────────────────────────────────────────────────────────────────────
// Una riga di audit, da un posto solo.
//
// Chi ha fatto cosa, su quale record, quando — e, per le modifiche, QUALI
// campi sono cambiati, mai i valori: l'audit deve rispondere a «chi ha
// cambiato l'indirizzo di questa allieva, e quando», non conservare una
// seconda copia dell'indirizzo. Scrivere l'audit non deve mai far fallire
// l'operazione che lo descrive: l'errore si logga e basta.
// ─────────────────────────────────────────────────────────────────────────

export type AuditInput = {
  userId: string
  action: AuditAction
  entityType: string
  entityId: string
  changes?: Prisma.InputJsonValue
}

export async function logAudit(
  input: AuditInput,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<void> {
  try {
    await tx.auditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        changes: input.changes,
      },
    })
  } catch (error) {
    console.error("[audit] write failed", {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      code: (error as { code?: unknown })?.code,
    })
  }
}
