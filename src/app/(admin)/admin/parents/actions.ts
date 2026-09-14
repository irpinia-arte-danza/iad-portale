"use server"

import { revalidatePath } from "next/cache"

import { Prisma, UserRole } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { sendAccessInviteCore } from "@/lib/auth/access-emails"
import type { AccessInviteResult } from "@/lib/auth/access-status-types"
import { requireAdmin } from "@/lib/auth/require-admin"
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

// Creare un genitore NON invia nulla: l'accesso al portale è un'azione
// esplicita e ripetibile (sendAccessInvite), da lanciare a dati completi.
export async function createParent(
  values: ParentCreateValues
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin()

  const parsed = parentCreateSchema.safeParse(values)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi" }
  }

  try {
    const parent = await prisma.parent.create({
      data: cleanEmptyStrings(parsed.data),
      select: { id: true },
    })

    revalidatePath(PARENTS_PATH)
    return { ok: true, data: { id: parent.id } }
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
      select: { deletedAt: true, userId: true },
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

    await prisma.$transaction([
      prisma.parent.update({
        where: { id: idParsed.data },
        data: { deletedAt: new Date() },
      }),
      // Nel cestino = niente accesso al portale. L'utente viene riattivato
      // al ripristino (cestino/actions.ts).
      ...(parent.userId
        ? [
            prisma.user.updateMany({
              where: { id: parent.userId, role: UserRole.PARENT },
              data: { isActive: false },
            }),
          ]
        : []),
    ])

    revalidatePath(PARENTS_PATH)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

// "Invia accesso" / "Reinvia accesso". Ripetibile: ogni invio genera un link
// nuovo e invalida il precedente. skipRevalidate per l'invio multiplo, che
// aggiorna la pagina una sola volta alla fine.
export async function sendAccessInvite(
  parentId: string,
  options?: { skipRevalidate?: boolean },
): Promise<AccessInviteResult> {
  const { userId } = await requireAdmin()

  const idParsed = uuidSchema.safeParse(parentId)
  if (!idParsed.success) {
    return { ok: false, code: "NOT_FOUND", error: "Identificativo non valido" }
  }

  const result = await sendAccessInviteCore({
    kind: "PARENT",
    profileId: idParsed.data,
    adminUserId: userId,
  })

  if (!options?.skipRevalidate) {
    revalidatePath(PARENTS_PATH)
    revalidatePath(`${PARENTS_PATH}/${idParsed.data}`)
  }
  return result
}
