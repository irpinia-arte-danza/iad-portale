"use server"

import { revalidatePath } from "next/cache"

import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
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

function mapPrismaError(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return "Codice fiscale già esistente"
    if (error.code === "P2025") return "Genitore non trovato"
    if (error.code === "P2003") return "Riferimento a record inesistente"
  }
  console.error("[parents action] unexpected error", error)
  return "Errore interno, riprova"
}

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
      data: parsed.data,
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
      data: parsed.data,
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
