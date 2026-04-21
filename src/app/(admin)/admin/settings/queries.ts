import { cache } from "react"

import { prisma } from "@/lib/prisma"

export const getBrandSettings = cache(async () => {
  const settings = await prisma.brandSettings.findUnique({ where: { id: 1 } })
  if (!settings) {
    throw new Error("BrandSettings non trovato (seed non eseguito?)")
  }
  return settings
})

export const getReceiptSettings = cache(async () => {
  const settings = await prisma.receiptSettings.findUnique({ where: { id: 1 } })
  if (!settings) {
    throw new Error("ReceiptSettings non trovato (seed non eseguito?)")
  }
  return settings
})

export const getUserProfile = cache(async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      themePreference: true,
      localePreference: true,
    },
  })
  if (!user) throw new Error("Utente non trovato")
  return user
})

export const getAdminUsers = cache(async () => {
  return prisma.user.findMany({
    where: { role: "ADMIN", deletedAt: null },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  })
})

export type AuditLogRow = {
  id: string
  action: string
  entityType: string
  entityId: string | null
  createdAt: Date
  userEmail: string | null
  userName: string | null
  changes: unknown
}

export async function getSettingsAuditLog(
  limit = 50,
): Promise<AuditLogRow[]> {
  const rows = await prisma.auditLog.findMany({
    where: {
      entityType: { in: ["BrandSettings", "ReceiptSettings", "User"] },
      action: {
        in: [
          "UPDATE_BRAND",
          "UPDATE_ASSOCIATION",
          "UPDATE_RICEVUTE",
          "UPDATE_PROFILE",
          "CHANGE_PASSWORD",
          "INVITE_ADMIN",
          "LOGO_UPLOAD",
          "LOGO_DELETE",
        ],
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: {
        select: { email: true, firstName: true, lastName: true },
      },
    },
  })

  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    entityType: r.entityType,
    entityId: r.entityId,
    createdAt: r.createdAt,
    userEmail: r.user?.email ?? null,
    userName: r.user
      ? [r.user.firstName, r.user.lastName].filter(Boolean).join(" ") || null
      : null,
    changes: r.changes,
  }))
}
