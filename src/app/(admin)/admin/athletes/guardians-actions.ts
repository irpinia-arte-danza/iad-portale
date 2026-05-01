"use server"

import { revalidatePath } from "next/cache"
import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"
import type { ActionResult } from "@/lib/schemas/common"
import { uuidSchema } from "@/lib/schemas/common"
import {
  guardianRelationSchema,
  newGuardianParentSchema,
  type GuardianRelationValues,
  type NewGuardianParentValues,
} from "@/lib/schemas/guardian"

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
    if (error.code === "P2002")
      return "Questo genitore è già collegato a questa allieva"
    if (error.code === "P2025") return "Record non trovato"
    if (error.code === "P2003") return "Riferimento a record inesistente"
  }
  console.error("[guardians action] unexpected error", error)
  return "Errore interno, riprova"
}

async function clearPrimaryFlagsBeforeWrite(
  tx: Prisma.TransactionClient,
  athleteId: string,
  excludeId: string | null,
  flags: { isPrimaryContact: boolean; isPrimaryPayer: boolean }
) {
  const updates: Promise<unknown>[] = []
  if (flags.isPrimaryContact) {
    updates.push(
      tx.athleteParent.updateMany({
        where: {
          athleteId,
          ...(excludeId ? { NOT: { id: excludeId } } : {}),
        },
        data: { isPrimaryContact: false },
      })
    )
  }
  if (flags.isPrimaryPayer) {
    updates.push(
      tx.athleteParent.updateMany({
        where: {
          athleteId,
          ...(excludeId ? { NOT: { id: excludeId } } : {}),
        },
        data: { isPrimaryPayer: false },
      })
    )
  }
  if (updates.length > 0) await Promise.all(updates)
}

export async function linkExistingGuardian(
  athleteId: string,
  parentId: string,
  relationData: GuardianRelationValues
): Promise<ActionResult> {
  await requireAdmin()

  const athleteIdParsed = uuidSchema.safeParse(athleteId)
  const parentIdParsed = uuidSchema.safeParse(parentId)
  if (!athleteIdParsed.success || !parentIdParsed.success) {
    return { ok: false, error: "Identificativo non valido" }
  }

  const parsed = guardianRelationSchema.safeParse(relationData)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      await clearPrimaryFlagsBeforeWrite(
        tx,
        athleteIdParsed.data,
        null,
        parsed.data
      )
      const pivot = await tx.athleteParent.create({
        data: {
          athleteId: athleteIdParsed.data,
          parentId: parentIdParsed.data,
          ...parsed.data,
        },
        select: { id: true },
      })
      return pivot
    })
    revalidatePath(`${ATHLETES_PATH}/${athleteIdParsed.data}`)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

export async function linkNewGuardian(
  athleteId: string,
  parentData: NewGuardianParentValues,
  relationData: GuardianRelationValues
): Promise<ActionResult<{ parentId: string }>> {
  await requireAdmin()

  const athleteIdParsed = uuidSchema.safeParse(athleteId)
  if (!athleteIdParsed.success) {
    return { ok: false, error: "Identificativo non valido" }
  }

  const parentParsed = newGuardianParentSchema.safeParse(parentData)
  if (!parentParsed.success) {
    return {
      ok: false,
      error:
        parentParsed.error.issues[0]?.message ?? "Dati genitore non validi",
    }
  }

  const relationParsed = guardianRelationSchema.safeParse(relationData)
  if (!relationParsed.success) {
    return {
      ok: false,
      error:
        relationParsed.error.issues[0]?.message ?? "Dati relazione non validi",
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const cleanedParent = cleanEmptyStrings(parentParsed.data)
      const parent = await tx.parent.create({
        data: cleanedParent,
        select: { id: true },
      })
      await clearPrimaryFlagsBeforeWrite(
        tx,
        athleteIdParsed.data,
        null,
        relationParsed.data
      )
      const pivot = await tx.athleteParent.create({
        data: {
          athleteId: athleteIdParsed.data,
          parentId: parent.id,
          ...relationParsed.data,
        },
        select: { id: true },
      })
      return { parentId: parent.id }
    })
    revalidatePath(`${ATHLETES_PATH}/${athleteIdParsed.data}`)
    return { ok: true, data: result }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

export async function unlinkGuardian(
  athleteParentId: string
): Promise<ActionResult> {
  await requireAdmin()

  const idParsed = uuidSchema.safeParse(athleteParentId)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo non valido" }
  }

  try {
    const pivot = await prisma.athleteParent.findUnique({
      where: { id: idParsed.data },
      select: { athleteId: true },
    })
    if (!pivot) {
      return { ok: false, error: "Collegamento non trovato" }
    }
    await prisma.athleteParent.delete({
      where: { id: idParsed.data },
    })
    revalidatePath(`${ATHLETES_PATH}/${pivot.athleteId}`)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

export async function updateGuardianRelation(
  athleteParentId: string,
  relationData: GuardianRelationValues
): Promise<ActionResult> {
  await requireAdmin()

  const idParsed = uuidSchema.safeParse(athleteParentId)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo non valido" }
  }

  const parsed = guardianRelationSchema.safeParse(relationData)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    }
  }

  try {
    const athleteId = await prisma.$transaction(async (tx) => {
      const existing = await tx.athleteParent.findUnique({
        where: { id: idParsed.data },
        select: { athleteId: true },
      })
      if (!existing) {
        return null
      }

      await clearPrimaryFlagsBeforeWrite(
        tx,
        existing.athleteId,
        idParsed.data,
        parsed.data
      )

      const pivot = await tx.athleteParent.update({
        where: { id: idParsed.data },
        data: parsed.data,
        select: { athleteId: true },
      })
      return pivot.athleteId
    })
    if (!athleteId) {
      return { ok: false, error: "Record non trovato" }
    }
    revalidatePath(`${ATHLETES_PATH}/${athleteId}`)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

export async function searchParentsForLinking(
  athleteId: string,
  search: string
) {
  await requireAdmin()

  const athleteIdParsed = uuidSchema.safeParse(athleteId)
  if (!athleteIdParsed.success) {
    return []
  }

  const trimmed = search.trim()
  if (trimmed.length === 0) return []

  return prisma.parent.findMany({
    where: {
      deletedAt: null,
      NOT: {
        athleteRelations: { some: { athleteId: athleteIdParsed.data } },
      },
      OR: [
        { firstName: { contains: trimmed, mode: "insensitive" } },
        { lastName: { contains: trimmed, mode: "insensitive" } },
        { email: { contains: trimmed, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      _count: {
        select: {
          athleteRelations: {
            where: { athlete: { deletedAt: null } },
          },
        },
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 10,
  })
}
