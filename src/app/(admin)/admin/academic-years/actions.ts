"use server"

import { revalidatePath } from "next/cache"

import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"
import type { ActionResult } from "@/lib/schemas/common"
import { uuidSchema } from "@/lib/schemas/common"
import {
  academicYearSchema,
  type AcademicYearValues,
} from "@/lib/schemas/academic-year"

const AY_PATH = "/admin/academic-years"

function mapPrismaError(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return "Anno con questo label già esistente"
    if (error.code === "P2025") return "Anno accademico non trovato"
  }
  console.error("[academic-years action] error", error)
  return "Errore interno, riprova"
}

function normalize(values: AcademicYearValues) {
  return {
    label: values.label,
    startDate: values.startDate,
    endDate: values.endDate,
    associationFeeCents: Math.round(values.associationFeeEur * 100),
    monthlyRenewalDay: values.monthlyRenewalDay ?? 10,
  }
}

export async function createAcademicYear(
  values: AcademicYearValues,
): Promise<ActionResult<{ id: string }>> {
  const { userId } = await requireAdmin()

  const parsed = academicYearSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    }
  }

  try {
    const ay = await prisma.academicYear.create({
      data: normalize(parsed.data),
      select: { id: true },
    })

    await prisma.auditLog.create({
      data: {
        userId,
        action: "AY_CREATE",
        entityType: "AcademicYear",
        entityId: ay.id,
        changes: parsed.data as unknown as Prisma.InputJsonValue,
      },
    })

    revalidatePath(AY_PATH)
    return { ok: true, data: { id: ay.id } }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

export async function updateAcademicYear(
  id: string,
  values: AcademicYearValues,
): Promise<ActionResult> {
  const { userId } = await requireAdmin()

  const idParsed = uuidSchema.safeParse(id)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo non valido" }
  }

  const parsed = academicYearSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    }
  }

  try {
    await prisma.academicYear.update({
      where: { id: idParsed.data },
      data: normalize(parsed.data),
    })

    await prisma.auditLog.create({
      data: {
        userId,
        action: "AY_UPDATE",
        entityType: "AcademicYear",
        entityId: idParsed.data,
        changes: parsed.data as unknown as Prisma.InputJsonValue,
      },
    })

    revalidatePath(AY_PATH)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

// Atomic: tutti isCurrent=false, target=true. Idempotente se target già current.
export async function setCurrentAcademicYear(
  id: string,
): Promise<ActionResult> {
  const { userId } = await requireAdmin()

  const idParsed = uuidSchema.safeParse(id)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo non valido" }
  }

  try {
    const target = await prisma.academicYear.findUnique({
      where: { id: idParsed.data },
      select: { id: true, label: true, isCurrent: true },
    })
    if (!target) return { ok: false, error: "Anno accademico non trovato" }

    if (target.isCurrent) {
      return { ok: true } // idempotente
    }

    await prisma.$transaction([
      prisma.academicYear.updateMany({
        where: { isCurrent: true, NOT: { id: idParsed.data } },
        data: { isCurrent: false },
      }),
      prisma.academicYear.update({
        where: { id: idParsed.data },
        data: { isCurrent: true },
      }),
      prisma.auditLog.create({
        data: {
          userId,
          action: "AY_SET_CURRENT",
          entityType: "AcademicYear",
          entityId: idParsed.data,
          changes: { label: target.label },
        },
      }),
    ])

    revalidatePath(AY_PATH)
    revalidatePath("/admin/dashboard")
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

// Combo action: crea nuovo AA + lo imposta come corrente in singola transazione.
// Usato dal dialog "Inizia nuovo anno accademico".
export async function createAndSetCurrentAcademicYear(
  values: AcademicYearValues,
): Promise<ActionResult<{ id: string }>> {
  const { userId } = await requireAdmin()

  const parsed = academicYearSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.academicYear.updateMany({
        where: { isCurrent: true },
        data: { isCurrent: false },
      })
      const ay = await tx.academicYear.create({
        data: { ...normalize(parsed.data), isCurrent: true },
        select: { id: true, label: true },
      })
      await tx.auditLog.create({
        data: {
          userId,
          action: "AY_CREATE",
          entityType: "AcademicYear",
          entityId: ay.id,
          changes: parsed.data as unknown as Prisma.InputJsonValue,
        },
      })
      await tx.auditLog.create({
        data: {
          userId,
          action: "AY_SET_CURRENT",
          entityType: "AcademicYear",
          entityId: ay.id,
          changes: { label: ay.label },
        },
      })
      return ay
    })

    revalidatePath(AY_PATH)
    revalidatePath("/admin/dashboard")
    return { ok: true, data: { id: result.id } }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}
