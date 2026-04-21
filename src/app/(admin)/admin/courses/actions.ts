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

const COURSES_PATH = "/admin/courses"

function mapPrismaError(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return "Valore duplicato"
    }
    if (error.code === "P2025") return "Corso non trovato"
    if (error.code === "P2003") return "Riferimento a record inesistente"
  }
  console.error("[courses action] unexpected error", error)
  return "Errore interno, riprova"
}

function normalizeInput(values: CourseCreateValues) {
  const {
    monthlyFeeEur,
    trimesterFeeEur,
    teacherId,
    description,
    level,
    minAge,
    maxAge,
    ...rest
  } = values

  return {
    ...rest,
    monthlyFeeCents: Math.round(monthlyFeeEur * 100),
    trimesterFeeCents:
      trimesterFeeEur !== undefined && trimesterFeeEur !== null
        ? Math.round(trimesterFeeEur * 100)
        : null,
    teacherId: teacherId && teacherId !== "" ? teacherId : null,
    description: description && description !== "" ? description : null,
    level: level && level !== "" ? level : null,
    minAge: minAge ?? null,
    maxAge: maxAge ?? null,
  }
}

export async function createCourse(
  values: CourseCreateValues,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin()

  const parsed = courseCreateSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    }
  }

  try {
    const course = await prisma.course.create({
      data: normalizeInput(parsed.data),
      select: { id: true },
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
  await requireAdmin()

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

  try {
    await prisma.course.update({
      where: { id: idParsed.data },
      data: normalizeInput(parsed.data),
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
  await requireAdmin()

  const idParsed = uuidSchema.safeParse(id)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo non valido" }
  }

  try {
    await prisma.course.update({
      where: { id: idParsed.data },
      data: { isActive },
    })
    revalidatePath(COURSES_PATH)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}
