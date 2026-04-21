"use server"

import { revalidatePath } from "next/cache"
import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"
import type { ActionResult } from "@/lib/schemas/common"
import { uuidSchema } from "@/lib/schemas/common"
import {
  athleteCreateSchema,
  athleteUpdateSchema,
  type AthleteCreateValues,
  type AthleteUpdateValues,
} from "@/lib/schemas/athlete"

const ATHLETES_PATH = "/admin/athletes"

function cleanEmptyStrings<T extends Record<string, unknown>>(data: T): T {
  const cleaned: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    cleaned[key] = value === "" ? null : value
  }
  return cleaned as T
}

function mapPrismaError(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return "Codice fiscale già esistente"
    if (error.code === "P2025") return "Allieva non trovata"
    if (error.code === "P2003") return "Riferimento a record inesistente"
  }
  console.error("[athletes action] unexpected error", error)
  return "Errore interno, riprova"
}

export async function createAthlete(
  values: AthleteCreateValues
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin()

  const parsed = athleteCreateSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    }
  }

  try {
    const cleaned = cleanEmptyStrings(parsed.data)
    const athlete = await prisma.athlete.create({
      data: cleaned,
      select: { id: true },
    })
    revalidatePath(ATHLETES_PATH)
    return { ok: true, data: { id: athlete.id } }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

export async function updateAthlete(
  id: string,
  values: AthleteUpdateValues
): Promise<ActionResult> {
  await requireAdmin()

  const idParsed = uuidSchema.safeParse(id)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo non valido" }
  }

  const parsed = athleteUpdateSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    }
  }

  try {
    const cleaned = cleanEmptyStrings(parsed.data)
    await prisma.athlete.update({
      where: { id: idParsed.data, deletedAt: null },
      data: cleaned,
    })
    revalidatePath(ATHLETES_PATH)
    revalidatePath(`${ATHLETES_PATH}/${idParsed.data}`)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

export async function softDeleteAthlete(id: string): Promise<ActionResult> {
  await requireAdmin()

  const idParsed = uuidSchema.safeParse(id)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo non valido" }
  }

  try {
    const athlete = await prisma.athlete.findUnique({
      where: { id: idParsed.data },
      select: { deletedAt: true },
    })

    if (!athlete || athlete.deletedAt !== null) {
      return { ok: false, error: "Allieva non trovata" }
    }

    await prisma.athlete.update({
      where: { id: idParsed.data },
      data: { deletedAt: new Date() },
    })

    revalidatePath(ATHLETES_PATH)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}
