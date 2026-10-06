"use server"

import { revalidatePath } from "next/cache"

import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"
import type { ActionResult } from "@/lib/schemas/common"
import { uuidSchema } from "@/lib/schemas/common"
import {
  courseCreateSchema,
  courseUpdateSchema,
  type CourseCreateValues,
  type CourseUpdateValues,
} from "@/lib/schemas/course"
import { logError } from "@/lib/logging/log-error"
import { GENERIC_ERROR_MESSAGE } from "@/lib/errors"
import { logAudit } from "@/lib/audit/log-audit"
import { changedFields } from "@/lib/audit/changed-fields"

const COURSES_PATH = "/admin/courses"

function mapPrismaError(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return "Valore duplicato"
    }
    if (error.code === "P2025") return "Corso non trovato"
    if (error.code === "P2003") return "Riferimento a record inesistente"
  }
  logError("[courses action] unexpected error", error)
  return GENERIC_ERROR_MESSAGE
}

// Risolve la lista teachers da inviare alla M2M:
// - Se input ha array `teachers` valorizzato → usa quello
// - Altrimenti, se solo `teacherId` legacy fornito → singolo entry primary
// - Altrimenti → array vuoto
function resolveTeachersInput(
  values: CourseCreateValues,
): { teacherId: string; isPrimary: boolean }[] {
  if (values.teachers && values.teachers.length > 0) return values.teachers
  if (values.teacherId && values.teacherId !== "") {
    return [{ teacherId: values.teacherId, isPrimary: true }]
  }
  return []
}

function normalizeCourseFields(values: CourseCreateValues) {
  const {
    monthlyFeeEur,
    trimesterFeeEur,
    description,
    level,
    minAge,
    maxAge,
    name,
    type,
    capacity,
  } = values

  return {
    name,
    type,
    capacity,
    monthlyFeeCents: Math.round(monthlyFeeEur * 100),
    trimesterFeeCents:
      trimesterFeeEur !== undefined && trimesterFeeEur !== null
        ? Math.round(trimesterFeeEur * 100)
        : null,
    description: description && description !== "" ? description : null,
    level: level && level !== "" ? level : null,
    minAge: minAge ?? null,
    maxAge: maxAge ?? null,
  }
}

export async function createCourse(
  values: CourseCreateValues,
): Promise<ActionResult<{ id: string }>> {
  const { userId } = await requireAdmin()

  const parsed = courseCreateSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    }
  }

  const teachers = resolveTeachersInput(parsed.data)
  const primary = teachers.find((t) => t.isPrimary) ?? null

  try {
    const course = await prisma.$transaction(async (tx) => {
      const c = await tx.course.create({
        data: {
          ...normalizeCourseFields(parsed.data),
          teacherId: primary?.teacherId ?? null,
        },
        select: { id: true },
      })
      if (teachers.length > 0) {
        await tx.teacherCourse.createMany({
          data: teachers.map((t) => ({
            teacherId: t.teacherId,
            courseId: c.id,
            isPrimary: t.isPrimary,
          })),
        })
      }
      return c
    })
    await logAudit({
      userId,
      action: "COURSE_CREATE",
      entityType: "Course",
      entityId: course.id,
      changes: { fields: Object.keys(normalizeCourseFields(parsed.data)), teachers: teachers.length },
    })
    revalidatePath(COURSES_PATH)
    return { ok: true, data: { id: course.id } }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

export async function updateCourse(
  id: string,
  values: CourseUpdateValues,
): Promise<ActionResult> {
  const { userId } = await requireAdmin()

  const idParsed = uuidSchema.safeParse(id)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo non valido" }
  }

  const parsed = courseUpdateSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    }
  }

  const teachers = resolveTeachersInput(parsed.data)
  const primary = teachers.find((t) => t.isPrimary) ?? null

  try {
    const before = await prisma.course.findUnique({ where: { id: idParsed.data } })
    await prisma.$transaction(async (tx) => {
      await tx.course.update({
        where: { id: idParsed.data },
        data: {
          ...normalizeCourseFields(parsed.data),
          teacherId: primary?.teacherId ?? null,
        },
      })
      // M2M sync: deleteMany + createMany è il pattern più semplice
      // (volumi piccoli, max 5 teacher per corso). Per volumi maggiori
      // fare diff incrementale.
      await tx.teacherCourse.deleteMany({
        where: { courseId: idParsed.data },
      })
      if (teachers.length > 0) {
        await tx.teacherCourse.createMany({
          data: teachers.map((t) => ({
            teacherId: t.teacherId,
            courseId: idParsed.data,
            isPrimary: t.isPrimary,
          })),
        })
      }
    })
    await logAudit({
      userId,
      action: "COURSE_UPDATE",
      entityType: "Course",
      entityId: idParsed.data,
      changes: { fields: changedFields(before, normalizeCourseFields(parsed.data)), teachers: teachers.length },
    })
    revalidatePath(COURSES_PATH)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

export async function toggleCourseActive(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  const { userId } = await requireAdmin()

  const idParsed = uuidSchema.safeParse(id)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo non valido" }
  }

  try {
    // Update by id ok per toggle isActive (soft-delete via deletedAt è
    // separato da archive flag isActive). Non filtra deletedAt:null per
    // permettere reattivazione di corsi ripristinati dal cestino.
    await prisma.course.update({
      where: { id: idParsed.data },
      data: { isActive },
    })
    await logAudit({
      userId,
      action: "COURSE_UPDATE",
      entityType: "Course",
      entityId: idParsed.data,
      changes: { fields: ["isActive"], isActive },
    })
    revalidatePath(COURSES_PATH)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}
