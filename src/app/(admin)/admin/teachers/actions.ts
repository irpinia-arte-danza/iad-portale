"use server"

import { revalidatePath } from "next/cache"

import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"
import { createAdminClient } from "@/lib/supabase/admin-client"
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

type CreateTeacherResult = {
  id: string
  invited: boolean
  inviteSkipReason?: "no-email" | "email-in-use" | "invite-failed"
}

async function inviteTeacherUser(
  teacherId: string,
  email: string,
  firstName: string | null,
  lastName: string | null,
  inviterId: string,
): Promise<CreateTeacherResult["inviteSkipReason"] | null> {
  // Skip se utente con quella email esiste già (qualunque ruolo): admin
  // gestisce manualmente collisioni
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, deletedAt: true },
  })
  if (existing && existing.deletedAt === null) {
    return "email-in-use"
  }

  // Invite teacher: stesso pattern parent (Sprint 4.A). Custom email
  // template Supabase usa {{ .SiteURL }} + token_hash + type=invite.
  // redirectTo qui è FALLBACK se template default attivo.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) {
    console.error("[teachers] NEXT_PUBLIC_APP_URL missing — invite redirect malformato")
    return "invite-failed"
  }

  try {
    const admin = createAdminClient()
    const redirectTo = `${appUrl}/auth/confirm?type=invite&next=/teacher/dashboard`

    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
    })
    if (error || !data?.user) {
      console.error("[teachers] invite failed", { email, error: error?.message })
      return "invite-failed"
    }

    await prisma.user.upsert({
      where: { id: data.user.id },
      update: {
        email,
        role: "TEACHER",
        firstName,
        lastName,
        isActive: true,
        deletedAt: null,
      },
      create: {
        id: data.user.id,
        email,
        role: "TEACHER",
        firstName,
        lastName,
        isActive: true,
      },
    })

    await prisma.teacher.update({
      where: { id: teacherId },
      data: { userId: data.user.id },
    })

    await prisma.auditLog.create({
      data: {
        userId: inviterId,
        action: "INVITE_TEACHER",
        entityType: "Teacher",
        entityId: teacherId,
        changes: { email, firstName, lastName, authUserId: data.user.id },
      },
    })

    return null
  } catch (error) {
    console.error("[teachers] invite unexpected error", { email, error })
    return "invite-failed"
  }
}

export async function createTeacher(
  values: TeacherCreateValues,
): Promise<ActionResult<CreateTeacherResult>> {
  const { userId } = await requireAdmin()

  const parsed = teacherCreateSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    }
  }

  try {
    const cleaned = cleanEmptyStrings(parsed.data)
    const teacher = await prisma.teacher.create({
      data: cleaned,
      select: { id: true, email: true, firstName: true, lastName: true },
    })

    let invited = false
    let inviteSkipReason: CreateTeacherResult["inviteSkipReason"]

    if (teacher.email && teacher.email.length > 0) {
      const reason = await inviteTeacherUser(
        teacher.id,
        teacher.email,
        teacher.firstName,
        teacher.lastName,
        userId,
      )
      if (reason === null) {
        invited = true
      } else {
        inviteSkipReason = reason
      }
    } else {
      inviteSkipReason = "no-email"
    }

    revalidatePath(TEACHERS_PATH)
    return {
      ok: true,
      data: { id: teacher.id, invited, inviteSkipReason },
    }
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
