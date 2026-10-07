import "server-only"

import { AuditAction, Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { logError } from "@/lib/logging/log-error"

type LogParams = {
  userId: string
  action: AuditAction
  entityType: "BrandSettings" | "ReceiptSettings" | "User" | "AdminDevice"
  entityId?: string | null
  changes?: Record<string, unknown> | null
}

export async function logSettingsChange(params: LogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        changes:
          params.changes === null || params.changes === undefined
            ? Prisma.JsonNull
            : (params.changes as Prisma.InputJsonValue),
      },
    })
  } catch (error) {
    logError("[audit] logSettingsChange failed", error, { action: params.action })
  }
}

export function diffChanges<T extends Record<string, unknown>>(
  before: T,
  after: Partial<T>,
): Record<string, { from: unknown; to: unknown }> {
  const diff: Record<string, { from: unknown; to: unknown }> = {}
  for (const key of Object.keys(after)) {
    const b = before[key as keyof T]
    const a = after[key as keyof T]
    if (b !== a) {
      diff[key] = { from: b, to: a }
    }
  }
  return diff
}
