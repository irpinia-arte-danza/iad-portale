"use server"

import { revalidatePath } from "next/cache"

import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"
import type { ActionResult } from "@/lib/schemas/common"
import { uuidSchema } from "@/lib/schemas/common"

const CESTINO_PATH = "/admin/cestino"

function mapPrismaError(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") return "Elemento non trovato"
  }
  console.error("[cestino action] error", error)
  return "Errore interno, riprova"
}

type EntityKind =
  | "athlete"
  | "parent"
  | "teacher"
  | "course"
  | "expense"
  | "cert"

const REVALIDATE_PATHS: Record<EntityKind, string[]> = {
  athlete: ["/admin/athletes"],
  parent: ["/admin/parents"],
  teacher: ["/admin/teachers"],
  course: ["/admin/courses"],
  expense: ["/admin/expenses"],
  cert: [],
}

const AUDIT_ACTIONS: Record<
  EntityKind,
  | "RESTORE_ATHLETE"
  | "RESTORE_PARENT"
  | "RESTORE_TEACHER"
  | "RESTORE_COURSE"
  | "RESTORE_EXPENSE"
  | "RESTORE_CERT"
> = {
  athlete: "RESTORE_ATHLETE",
  parent: "RESTORE_PARENT",
  teacher: "RESTORE_TEACHER",
  course: "RESTORE_COURSE",
  expense: "RESTORE_EXPENSE",
  cert: "RESTORE_CERT",
}

const ENTITY_TYPE: Record<EntityKind, string> = {
  athlete: "Athlete",
  parent: "Parent",
  teacher: "Teacher",
  course: "Course",
  expense: "Expense",
  cert: "MedicalCertificate",
}

async function doRestore(
  kind: EntityKind,
  id: string,
): Promise<ActionResult> {
  const { userId } = await requireAdmin()

  const idParsed = uuidSchema.safeParse(id)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo non valido" }
  }

  try {
    let athleteIdForRevalidate: string | null = null

    switch (kind) {
      case "athlete":
        await prisma.athlete.update({
          where: { id: idParsed.data },
          data: { deletedAt: null },
        })
        break
      case "parent":
        await prisma.parent.update({
          where: { id: idParsed.data },
          data: { deletedAt: null },
        })
        break
      case "teacher":
        await prisma.teacher.update({
          where: { id: idParsed.data },
          data: { deletedAt: null },
        })
        break
      case "course":
        await prisma.course.update({
          where: { id: idParsed.data },
          data: { deletedAt: null },
        })
        break
      case "expense":
        await prisma.expense.update({
          where: { id: idParsed.data },
          data: { deletedAt: null },
        })
        break
      case "cert": {
        const cert = await prisma.medicalCertificate.update({
          where: { id: idParsed.data },
          data: { deletedAt: null },
          select: { athleteId: true },
        })
        athleteIdForRevalidate = cert.athleteId
        break
      }
    }

    await prisma.auditLog.create({
      data: {
        userId,
        action: AUDIT_ACTIONS[kind],
        entityType: ENTITY_TYPE[kind],
        entityId: idParsed.data,
      },
    })

    revalidatePath(CESTINO_PATH)
    for (const path of REVALIDATE_PATHS[kind]) {
      revalidatePath(path)
    }
    if (athleteIdForRevalidate) {
      revalidatePath(`/admin/athletes/${athleteIdForRevalidate}`)
    }

    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

export async function restoreAthlete(id: string): Promise<ActionResult> {
  return doRestore("athlete", id)
}

export async function restoreParent(id: string): Promise<ActionResult> {
  return doRestore("parent", id)
}

export async function restoreTeacher(id: string): Promise<ActionResult> {
  return doRestore("teacher", id)
}

export async function restoreCourse(id: string): Promise<ActionResult> {
  return doRestore("course", id)
}

export async function restoreExpense(id: string): Promise<ActionResult> {
  return doRestore("expense", id)
}

export async function restoreMedicalCertificate(
  id: string,
): Promise<ActionResult> {
  return doRestore("cert", id)
}
