"use server"

import { revalidatePath } from "next/cache"

import { AthleteStatus, Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"
import type { ActionResult } from "@/lib/schemas/common"
import { uuidSchema } from "@/lib/schemas/common"
import {
  enrollmentCreateSchema,
  enrollmentUpdateSchema,
  withdrawEnrollmentSchema,
  type EnrollmentCreateValues,
  type EnrollmentUpdateValues,
  type WithdrawEnrollmentValues,
} from "@/lib/schemas/enrollment"

function athletePath(athleteId: string) {
  return `/admin/athletes/${athleteId}`
}

function mapPrismaError(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return "Allieva già iscritta a questo corso per l'anno corrente"
    }
    if (error.code === "P2025") return "Iscrizione non trovata"
    if (error.code === "P2003") return "Riferimento a record inesistente"
  }
  console.error("[enrollments action] unexpected error", error)
  return "Errore interno, riprova"
}

export async function createEnrollment(
  athleteId: string,
  values: EnrollmentCreateValues,
): Promise<ActionResult<{ id: string }>> {
  const { userId: adminUserId } = await requireAdmin()

  const athleteIdParsed = uuidSchema.safeParse(athleteId)
  if (!athleteIdParsed.success) {
    return { ok: false, error: "Identificativo allieva non valido" }
  }

  const parsed = enrollmentCreateSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    }
  }

  const currentAY = await prisma.academicYear.findFirst({
    where: { isCurrent: true },
    select: { id: true, label: true },
  })
  if (!currentAY) {
    return { ok: false, error: "Nessun anno accademico corrente configurato" }
  }

  const course = await prisma.course.findUnique({
    where: { id: parsed.data.courseId },
    select: { id: true, name: true, isActive: true },
  })
  if (!course) {
    return { ok: false, error: "Corso non trovato" }
  }
  if (!course.isActive) {
    return { ok: false, error: "Corso non attivo" }
  }

  const athlete = await prisma.athlete.findUnique({
    where: { id: athleteIdParsed.data, deletedAt: null },
    select: { id: true, status: true },
  })
  if (!athlete) {
    return { ok: false, error: "Allieva non trovata" }
  }

  try {
    const enrollmentId = await prisma.$transaction(async (tx) => {
      const enrollment = await tx.courseEnrollment.create({
        data: {
          athleteId: athleteIdParsed.data,
          courseId: parsed.data.courseId,
          academicYearId: currentAY.id,
          enrollmentDate: parsed.data.enrollmentDate ?? new Date(),
          notes:
            parsed.data.notes && parsed.data.notes !== ""
              ? parsed.data.notes
              : null,
        },
        select: { id: true },
      })

      if (athlete.status === AthleteStatus.TRIAL) {
        await tx.athlete.update({
          where: { id: athleteIdParsed.data },
          data: { status: AthleteStatus.ACTIVE },
        })
        await tx.athleteStatusHistory.create({
          data: {
            athleteId: athleteIdParsed.data,
            oldStatus: AthleteStatus.TRIAL,
            newStatus: AthleteStatus.ACTIVE,
            reason: `Prima iscrizione al corso ${course.name}`,
            changedBy: adminUserId,
          },
        })
      }

      return enrollment.id
    })

    revalidatePath(athletePath(athleteIdParsed.data))
    return { ok: true, data: { id: enrollmentId } }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

export async function updateEnrollment(
  enrollmentId: string,
  values: EnrollmentUpdateValues,
): Promise<ActionResult> {
  await requireAdmin()

  const idParsed = uuidSchema.safeParse(enrollmentId)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo iscrizione non valido" }
  }

  const parsed = enrollmentUpdateSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    }
  }

  const existing = await prisma.courseEnrollment.findUnique({
    where: { id: idParsed.data },
    select: { athleteId: true },
  })
  if (!existing) {
    return { ok: false, error: "Iscrizione non trovata" }
  }

  try {
    await prisma.courseEnrollment.update({
      where: { id: idParsed.data },
      data: {
        notes:
          parsed.data.notes && parsed.data.notes !== ""
            ? parsed.data.notes
            : null,
      },
    })
    revalidatePath(athletePath(existing.athleteId))
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

export async function withdrawEnrollment(
  enrollmentId: string,
  values: WithdrawEnrollmentValues,
): Promise<ActionResult> {
  await requireAdmin()

  const idParsed = uuidSchema.safeParse(enrollmentId)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo iscrizione non valido" }
  }

  const parsed = withdrawEnrollmentSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    }
  }

  const existing = await prisma.courseEnrollment.findUnique({
    where: { id: idParsed.data },
    select: { athleteId: true },
  })
  if (!existing) {
    return { ok: false, error: "Iscrizione non trovata" }
  }

  try {
    await prisma.courseEnrollment.update({
      where: { id: idParsed.data },
      data: { withdrawalDate: parsed.data.withdrawalDate },
    })
    revalidatePath(athletePath(existing.athleteId))
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}
