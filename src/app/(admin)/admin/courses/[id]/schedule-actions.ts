"use server"

import { revalidatePath } from "next/cache"

import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"
import type { ActionResult } from "@/lib/schemas/common"
import { uuidSchema } from "@/lib/schemas/common"
import {
  courseScheduleSchema,
  type CourseScheduleValues,
} from "@/lib/schemas/course-schedule"

function mapPrismaError(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") return "Orario non trovato"
    if (error.code === "P2003") return "Riferimento a corso inesistente"
  }
  console.error("[schedule action] unexpected error", error)
  return "Errore interno, riprova"
}

function revalidateCourse(courseId: string) {
  revalidatePath(`/admin/courses/${courseId}`)
  revalidatePath("/admin/courses")
}

export async function createSchedule(
  values: CourseScheduleValues,
): Promise<ActionResult<{ id: string }>> {
  const { userId } = await requireAdmin()

  const parsed = courseScheduleSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    }
  }

  const { courseId, location, validTo, ...rest } = parsed.data

  try {
    const schedule = await prisma.courseSchedule.create({
      data: {
        ...rest,
        courseId,
        location: location && location !== "" ? location : null,
        validTo: validTo ?? null,
      },
      select: { id: true },
    })

    await prisma.auditLog.create({
      data: {
        userId,
        action: "SCHEDULE_CREATE",
        entityType: "CourseSchedule",
        entityId: schedule.id,
        changes: parsed.data as unknown as Prisma.InputJsonValue,
      },
    })

    revalidateCourse(courseId)
    return { ok: true, data: { id: schedule.id } }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

export async function updateSchedule(
  scheduleId: string,
  values: CourseScheduleValues,
): Promise<ActionResult> {
  const { userId } = await requireAdmin()

  const idParsed = uuidSchema.safeParse(scheduleId)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo orario non valido" }
  }

  const parsed = courseScheduleSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    }
  }

  const { courseId, location, validTo, ...rest } = parsed.data

  try {
    const existing = await prisma.courseSchedule.findUnique({
      where: { id: idParsed.data },
      select: { courseId: true },
    })
    if (!existing) return { ok: false, error: "Orario non trovato" }
    // Defense in depth: courseId del payload deve corrispondere a quello DB
    if (existing.courseId !== courseId) {
      return { ok: false, error: "Corso non corrispondente" }
    }

    await prisma.courseSchedule.update({
      where: { id: idParsed.data },
      data: {
        ...rest,
        location: location && location !== "" ? location : null,
        validTo: validTo ?? null,
      },
    })

    await prisma.auditLog.create({
      data: {
        userId,
        action: "SCHEDULE_UPDATE",
        entityType: "CourseSchedule",
        entityId: idParsed.data,
        changes: parsed.data as unknown as Prisma.InputJsonValue,
      },
    })

    revalidateCourse(courseId)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

export async function deleteSchedule(
  scheduleId: string,
): Promise<ActionResult> {
  const { userId } = await requireAdmin()

  const idParsed = uuidSchema.safeParse(scheduleId)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo orario non valido" }
  }

  try {
    const existing = await prisma.courseSchedule.findUnique({
      where: { id: idParsed.data },
      select: {
        courseId: true,
        _count: { select: { lessons: true } },
      },
    })
    if (!existing) return { ok: false, error: "Orario non trovato" }

    // Hard delete: blocca solo se ci sono Lesson collegate (history)
    if (existing._count.lessons > 0) {
      return {
        ok: false,
        error: `Impossibile eliminare: orario con ${existing._count.lessons} ${
          existing._count.lessons === 1 ? "lezione" : "lezioni"
        } registrate. Imposta una data fine validità.`,
      }
    }

    await prisma.courseSchedule.delete({
      where: { id: idParsed.data },
    })

    await prisma.auditLog.create({
      data: {
        userId,
        action: "SCHEDULE_DELETE",
        entityType: "CourseSchedule",
        entityId: idParsed.data,
      },
    })

    revalidateCourse(existing.courseId)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}
