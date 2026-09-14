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

// Creare un insegnante NON invia nulla: l'accesso al portale è un'azione
// esplicita e ripetibile (sendTeacherAccessInvite).
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
      select: {
        deletedAt: true,
        userId: true,
        _count: { select: { courses: true, teacherCourses: true } },
      },
    })

    if (!teacher || teacher.deletedAt !== null) {
      return { ok: false, error: "Insegnante non trovato" }
    }

    // M2M Sprint 5 + legacy 1:N: blocca se collegato in entrambi
    const linkedCourses = Math.max(
      teacher._count.courses,
      teacher._count.teacherCourses,
    )
    if (linkedCourses > 0) {
      return {
        ok: false,
        error: `Impossibile eliminare: insegnante ha ${linkedCourses} ${
          linkedCourses === 1 ? "corso collegato" : "corsi collegati"
        }`,
      }
    }

    await prisma.$transaction([
      prisma.teacher.update({
        where: { id: idParsed.data },
        data: { deletedAt: new Date() },
      }),
      // Nel cestino = niente accesso al portale. L'utente viene riattivato
      // al ripristino (cestino/actions.ts).
      ...(teacher.userId
        ? [
            prisma.user.updateMany({
              where: { id: teacher.userId, role: UserRole.TEACHER },
              data: { isActive: false },
            }),
          ]
        : []),
    ])

    revalidatePath(TEACHERS_PATH)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

// "Invia accesso" / "Reinvia accesso" per insegnanti (vedi sendAccessInvite
// dei genitori).
export async function sendTeacherAccessInvite(
  teacherId: string,
): Promise<AccessInviteResult> {
  const { userId } = await requireAdmin()

  const idParsed = uuidSchema.safeParse(teacherId)
  if (!idParsed.success) {
    return { ok: false, code: "NOT_FOUND", error: "Identificativo non valido" }
  }

  const result = await sendAccessInviteCore({
    kind: "TEACHER",
    profileId: idParsed.data,
    adminUserId: userId,
  })

  revalidatePath(TEACHERS_PATH)
  revalidatePath(`${TEACHERS_PATH}/${idParsed.data}`)
  return result
}
