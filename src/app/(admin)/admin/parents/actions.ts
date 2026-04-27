"use server"

import { revalidatePath } from "next/cache"

import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"
import { createAdminClient } from "@/lib/supabase/admin-client"
import type { ActionResult } from "@/lib/schemas/common"
import { uuidSchema } from "@/lib/schemas/common"
import {
  parentCreateSchema,
  parentUpdateSchema,
  type ParentCreateValues,
  type ParentUpdateValues,
} from "@/lib/schemas/parent"

const PARENTS_PATH = "/admin/parents"

function cleanEmptyStrings<T extends Record<string, unknown>>(data: T): T {
  const cleaned: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    cleaned[key] = typeof value === "string" && value === "" ? null : value
  }
  return cleaned as T
}

function mapPrismaError(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const target = (error.meta?.target as string[] | undefined) ?? []
      if (target.includes("fiscal_code")) return "Codice fiscale già esistente"
      if (target.includes("email")) return "Email già in uso"
      return "Valore duplicato"
    }
    if (error.code === "P2025") return "Genitore non trovato"
    if (error.code === "P2003") return "Riferimento a record inesistente"
  }
  console.error("[parents action] unexpected error", error)
  return "Errore interno, riprova"
}

type CreateParentResult = {
  id: string
  invited: boolean
  inviteSkipReason?: "no-email" | "email-in-use" | "invite-failed"
}

async function inviteParentUser(
  parentId: string,
  email: string,
  firstName: string | null,
  lastName: string | null,
  inviterId: string,
): Promise<CreateParentResult["inviteSkipReason"] | null> {
  // Skip se utente con quella email esiste già (qualunque ruolo): admin
  // gestisce manualmente collisioni
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, deletedAt: true },
  })
  if (existing && existing.deletedAt === null) {
    return "email-in-use"
  }

  // Invite parent: il custom email template Supabase usa
  //   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/parent/dashboard
  // → /auth/confirm verifyOtp → /parent/set-password → /parent/dashboard.
  // redirectTo qui è FALLBACK per il caso in cui il template default sia
  // attivo invece del custom (configurazione Supabase Dashboard rollback).
  // (Admin invite in admin/settings/actions.ts usa /login: contesto diverso,
  // non toccare.)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) {
    console.error("[parents] NEXT_PUBLIC_APP_URL missing — invite redirect malformato")
    return "invite-failed"
  }

  try {
    const admin = createAdminClient()
    const redirectTo = `${appUrl}/auth/confirm?type=invite&next=/parent/dashboard`

    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
    })
    if (error || !data?.user) {
      console.error("[parents] invite failed", { email, error: error?.message })
      return "invite-failed"
    }

    await prisma.user.upsert({
      where: { id: data.user.id },
      update: {
        email,
        role: "PARENT",
        firstName,
        lastName,
        isActive: true,
        deletedAt: null,
      },
      create: {
        id: data.user.id,
        email,
        role: "PARENT",
        firstName,
        lastName,
        isActive: true,
      },
    })

    await prisma.parent.update({
      where: { id: parentId },
      data: { userId: data.user.id },
    })

    await prisma.auditLog.create({
      data: {
        userId: inviterId,
        action: "INVITE_PARENT",
        entityType: "Parent",
        entityId: parentId,
        changes: { email, firstName, lastName, authUserId: data.user.id },
      },
    })

    return null
  } catch (error) {
    console.error("[parents] invite unexpected error", { email, error })
    return "invite-failed"
  }
}

export async function createParent(
  values: ParentCreateValues
): Promise<ActionResult<CreateParentResult>> {
  const { userId } = await requireAdmin()

  const parsed = parentCreateSchema.safeParse(values)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi" }
  }

  try {
    const cleaned = cleanEmptyStrings(parsed.data)
    const parent = await prisma.parent.create({
      data: cleaned,
      select: { id: true, email: true, firstName: true, lastName: true },
    })

    let invited = false
    let inviteSkipReason: CreateParentResult["inviteSkipReason"]

    if (parent.email && parent.email.length > 0) {
      const reason = await inviteParentUser(
        parent.id,
        parent.email,
        parent.firstName,
        parent.lastName,
        userId,
      )
      if (reason === null) {
        invited = true
      } else {
        inviteSkipReason = reason
      }
    } else {
      inviteSkipReason = "no-email"
    }

    revalidatePath(PARENTS_PATH)
    return {
      ok: true,
      data: { id: parent.id, invited, inviteSkipReason },
    }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

export async function updateParent(
  id: string,
  values: ParentUpdateValues
): Promise<ActionResult> {
  await requireAdmin()

  const idParsed = uuidSchema.safeParse(id)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo non valido" }
  }

  const parsed = parentUpdateSchema.safeParse(values)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi" }
  }

  try {
    await prisma.parent.update({
      where: { id: idParsed.data, deletedAt: null },
      data: cleanEmptyStrings(parsed.data),
    })
    revalidatePath(PARENTS_PATH)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

export async function softDeleteParent(id: string): Promise<ActionResult> {
  await requireAdmin()

  const idParsed = uuidSchema.safeParse(id)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo non valido" }
  }

  try {
    const parent = await prisma.parent.findUnique({
      where: { id: idParsed.data },
      select: { deletedAt: true },
    })

    if (!parent || parent.deletedAt !== null) {
      return { ok: false, error: "Genitore non trovato" }
    }

    const activeLinks = await prisma.athleteParent.count({
      where: {
        parentId: idParsed.data,
        athlete: { deletedAt: null },
      },
    })

    if (activeLinks > 0) {
      return {
        ok: false,
        error: `Impossibile eliminare: genitore ha ${activeLinks} ${
          activeLinks === 1 ? "allieva attiva collegata" : "allieve attive collegate"
        }`,
      }
    }

    await prisma.parent.update({
      where: { id: idParsed.data },
      data: { deletedAt: new Date() },
    })

    revalidatePath(PARENTS_PATH)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}
