"use server"

import { revalidatePath } from "next/cache"

import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"
import type { ActionResult } from "@/lib/schemas/common"
import { uuidSchema } from "@/lib/schemas/common"
import {
  teacherCreateSchema,
  teacherUpdateSchema,
  type TeacherCreateValues,
  type TeacherUpdateValues,
} from "@/lib/schemas/teacher"

const TEACHERS_PATH = "/admin/teachers"

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
      if (target.includes("user_id")) return "Utente già collegato a un altro insegnante"
      return "Valore duplicato"
    }
    if (error.code === "P2025") return "Insegnante non trovato"
    if (error.code === "P2003") return "Riferimento a record inesistente"
  }
  console.error("[teachers action] unexpected error", error)
  return "Errore interno, riprova"
}

export async function createTeacher(
  values: TeacherCreateValues,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin()

  const parsed = teacherCreateSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    }
  }

  try {
    const teacher = await prisma.teacher.create({
      data: cleanEmptyStrings(parsed.data),
      select: { id: true },
    })
    revalidatePath(TEACHERS_PATH)
    return { ok: true, data: { id: teacher.id } }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

export async function updateTeacher(
  id: string,
  values: TeacherUpdateValues,
): Promise<ActionResult> {
  await requireAdmin()

  const idParsed = uuidSchema.safeParse(id)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo non valido" }
  }

  const parsed = teacherUpdateSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    }
  }

  try {
    await prisma.teacher.update({
      where: { id: idParsed.data, deletedAt: null },
      data: cleanEmptyStrings(parsed.data),
    })
    revalidatePath(TEACHERS_PATH)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

export async function softDeleteTeacher(id: string): Promise<ActionResult> {
  await requireAdmin()

  const idParsed = uuidSchema.safeParse(id)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo non valido" }
  }

  try {
    const teacher = await prisma.teacher.findUnique({
      where: { id: idParsed.data },
      select: { deletedAt: true, _count: { select: { courses: true } } },
    })

    if (!teacher || teacher.deletedAt !== null) {
      return { ok: false, error: "Insegnante non trovato" }
    }

    if (teacher._count.courses > 0) {
      return {
        ok: false,
        error: `Impossibile eliminare: insegnante ha ${teacher._count.courses} ${
          teacher._count.courses === 1 ? "corso collegato" : "corsi collegati"
        }`,
      }
    }

    await prisma.teacher.update({
      where: { id: idParsed.data },
      data: { deletedAt: new Date() },
    })

    revalidatePath(TEACHERS_PATH)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}
