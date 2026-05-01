"use server"

import { revalidatePath } from "next/cache"

import { AuditAction, Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"
import type { ActionResult } from "@/lib/schemas/common"
import { uuidSchema } from "@/lib/schemas/common"
import {
  deleteAllMedicalCertFilesForAthlete,
  deleteMedicalCertFile,
} from "@/lib/supabase/storage-medical-cert"

const CESTINO_PATH = "/admin/cestino"

function normalizeName(s: string): string {
  return s.trim().replace(/\s+/g, " ").toLowerCase()
}

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

// ============================================================================
// HARD DELETE — cascade transaction manuale + doppia conferma type-confirm.
// IRREVERSIBILE. Audit log dettagliato. Block su entità con dati fiscali
// (Payment, TeacherCompensation) per compliance.
// ============================================================================

const COMPLIANCE_BLOCK_PAYMENT =
  "Impossibile eliminare definitivamente: esistono pagamenti collegati. " +
  "I dati fiscali devono essere conservati per legge."

const COMPLIANCE_BLOCK_COMPENSATION =
  "Impossibile eliminare definitivamente: esiste storico compensi sportivi. " +
  "I dati fiscali devono essere conservati per legge."

export async function hardDeleteAthlete(
  athleteId: string,
  confirmName: string,
): Promise<ActionResult> {
  const { userId } = await requireAdmin()

  const idParsed = uuidSchema.safeParse(athleteId)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo allieva non valido" }
  }

  try {
    const athlete = await prisma.athlete.findUnique({
      where: { id: idParsed.data },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        deletedAt: true,
      },
    })
    if (!athlete) return { ok: false, error: "Allieva non trovata" }
    if (!athlete.deletedAt) {
      return {
        ok: false,
        error: "Sposta prima nel cestino, poi elimina definitivamente",
      }
    }

    const expected = `${athlete.firstName} ${athlete.lastName}`
    if (normalizeName(confirmName) !== normalizeName(expected)) {
      return { ok: false, error: "Nome di conferma non corrisponde" }
    }

    const paymentCount = await prisma.payment.count({
      where: { athleteId: athlete.id },
    })
    if (paymentCount > 0) {
      return { ok: false, error: COMPLIANCE_BLOCK_PAYMENT }
    }

    const certs = await prisma.medicalCertificate.findMany({
      where: { athleteId: athlete.id },
      select: { filePath: true },
    })

    await prisma.$transaction([
      prisma.attendance.deleteMany({ where: { athleteId: athlete.id } }),
      prisma.affiliation.deleteMany({ where: { athleteId: athlete.id } }),
      prisma.insurance.deleteMany({ where: { athleteId: athlete.id } }),
      prisma.consent.deleteMany({ where: { athleteId: athlete.id } }),
      prisma.document.deleteMany({ where: { athleteId: athlete.id } }),
      prisma.athleteStatusHistory.deleteMany({
        where: { athleteId: athlete.id },
      }),
      prisma.medicalCertificate.deleteMany({
        where: { athleteId: athlete.id },
      }),
      prisma.stageEnrollment.deleteMany({
        where: { athleteId: athlete.id },
      }),
      prisma.showcaseParticipation.deleteMany({
        where: { athleteId: athlete.id },
      }),
      prisma.courseEnrollment.deleteMany({
        where: { athleteId: athlete.id },
      }),
      prisma.athleteParent.deleteMany({ where: { athleteId: athlete.id } }),
      prisma.athlete.delete({ where: { id: athlete.id } }),
    ])

    // Storage cleanup post-transaction (file orfani recuperabili da Dashboard)
    const storage = await deleteAllMedicalCertFilesForAthlete(athlete.id)

    await prisma.auditLog.create({
      data: {
        userId,
        action: AuditAction.HARD_DELETE_ATHLETE,
        entityType: "Athlete",
        entityId: athlete.id,
        changes: {
          name: expected,
          certFilesRemoved: storage.removed,
          certFilesError: storage.error,
          dbCertCount: certs.length,
        },
      },
    })

    revalidatePath(CESTINO_PATH)
    revalidatePath("/admin/athletes")
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

export async function hardDeleteParent(
  parentId: string,
  confirmName: string,
): Promise<ActionResult> {
  const { userId } = await requireAdmin()

  const idParsed = uuidSchema.safeParse(parentId)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo genitore non valido" }
  }

  try {
    const parent = await prisma.parent.findUnique({
      where: { id: idParsed.data },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        deletedAt: true,
      },
    })
    if (!parent) return { ok: false, error: "Genitore non trovato" }
    if (!parent.deletedAt) {
      return {
        ok: false,
        error: "Sposta prima nel cestino, poi elimina definitivamente",
      }
    }

    const expected = `${parent.firstName} ${parent.lastName}`
    if (normalizeName(confirmName) !== normalizeName(expected)) {
      return { ok: false, error: "Nome di conferma non corrisponde" }
    }

    const paymentCount = await prisma.payment.count({
      where: { parentId: parent.id },
    })
    if (paymentCount > 0) {
      return { ok: false, error: COMPLIANCE_BLOCK_PAYMENT }
    }

    await prisma.$transaction([
      prisma.consent.deleteMany({ where: { parentId: parent.id } }),
      prisma.athleteParent.deleteMany({ where: { parentId: parent.id } }),
      prisma.parent.delete({ where: { id: parent.id } }),
    ])

    await prisma.auditLog.create({
      data: {
        userId,
        action: AuditAction.HARD_DELETE_PARENT,
        entityType: "Parent",
        entityId: parent.id,
        changes: { name: expected },
      },
    })

    revalidatePath(CESTINO_PATH)
    revalidatePath("/admin/parents")
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

export async function hardDeleteTeacher(
  teacherId: string,
  confirmName: string,
): Promise<ActionResult> {
  const { userId } = await requireAdmin()

  const idParsed = uuidSchema.safeParse(teacherId)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo insegnante non valido" }
  }

  try {
    const teacher = await prisma.teacher.findUnique({
      where: { id: idParsed.data },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        deletedAt: true,
      },
    })
    if (!teacher) return { ok: false, error: "Insegnante non trovato" }
    if (!teacher.deletedAt) {
      return {
        ok: false,
        error: "Sposta prima nel cestino, poi elimina definitivamente",
      }
    }

    const expected = `${teacher.firstName} ${teacher.lastName}`
    if (normalizeName(confirmName) !== normalizeName(expected)) {
      return { ok: false, error: "Nome di conferma non corrisponde" }
    }

    const compensationCount = await prisma.teacherCompensation.count({
      where: { teacherId: teacher.id },
    })
    if (compensationCount > 0) {
      return { ok: false, error: COMPLIANCE_BLOCK_COMPENSATION }
    }

    await prisma.$transaction([
      // TeacherCourse ha onDelete: Cascade → si pulisce da sé alla delete
      // del Teacher. Course.teacherId è 1:N legacy nullable: lo nullifichiamo
      // prima per evitare violazione FK (default RESTRICT).
      prisma.course.updateMany({
        where: { teacherId: teacher.id },
        data: { teacherId: null },
      }),
      prisma.teacher.delete({ where: { id: teacher.id } }),
    ])

    await prisma.auditLog.create({
      data: {
        userId,
        action: AuditAction.HARD_DELETE_TEACHER,
        entityType: "Teacher",
        entityId: teacher.id,
        changes: { name: expected },
      },
    })

    revalidatePath(CESTINO_PATH)
    revalidatePath("/admin/teachers")
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

export async function hardDeleteCourse(
  courseId: string,
  confirmName: string,
): Promise<ActionResult> {
  const { userId } = await requireAdmin()

  const idParsed = uuidSchema.safeParse(courseId)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo corso non valido" }
  }

  try {
    const course = await prisma.course.findUnique({
      where: { id: idParsed.data },
      select: { id: true, name: true, deletedAt: true },
    })
    if (!course) return { ok: false, error: "Corso non trovato" }
    if (!course.deletedAt) {
      return {
        ok: false,
        error: "Sposta prima nel cestino, poi elimina definitivamente",
      }
    }

    if (normalizeName(confirmName) !== normalizeName(course.name)) {
      return { ok: false, error: "Nome di conferma non corrisponde" }
    }

    const enrollmentIds = await prisma.courseEnrollment.findMany({
      where: { courseId: course.id },
      select: { id: true },
    })
    if (enrollmentIds.length > 0) {
      const paymentCount = await prisma.payment.count({
        where: {
          courseEnrollmentId: { in: enrollmentIds.map((e) => e.id) },
        },
      })
      if (paymentCount > 0) {
        return { ok: false, error: COMPLIANCE_BLOCK_PAYMENT }
      }
    }

    const scheduleIds = await prisma.courseSchedule.findMany({
      where: { courseId: course.id },
      select: { id: true },
    })
    const scheduleIdList = scheduleIds.map((s) => s.id)

    await prisma.$transaction([
      prisma.paymentSchedule.deleteMany({
        where: {
          courseEnrollmentId: { in: enrollmentIds.map((e) => e.id) },
        },
      }),
      prisma.attendance.deleteMany({
        where: { lesson: { scheduleId: { in: scheduleIdList } } },
      }),
      prisma.lesson.deleteMany({
        where: { scheduleId: { in: scheduleIdList } },
      }),
      prisma.courseSchedule.deleteMany({ where: { courseId: course.id } }),
      prisma.courseEnrollment.deleteMany({
        where: { courseId: course.id },
      }),
      // TeacherCourse cascade onDelete su Course delete
      prisma.course.delete({ where: { id: course.id } }),
    ])

    await prisma.auditLog.create({
      data: {
        userId,
        action: AuditAction.HARD_DELETE_COURSE,
        entityType: "Course",
        entityId: course.id,
        changes: {
          name: course.name,
          enrollmentsRemoved: enrollmentIds.length,
          schedulesRemoved: scheduleIds.length,
        },
      },
    })

    revalidatePath(CESTINO_PATH)
    revalidatePath("/admin/courses")
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

export async function hardDeleteExpense(
  expenseId: string,
  confirmDate: string, // formato yyyy-mm-dd
): Promise<ActionResult> {
  const { userId } = await requireAdmin()

  const idParsed = uuidSchema.safeParse(expenseId)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo spesa non valido" }
  }

  try {
    const expense = await prisma.expense.findUnique({
      where: { id: idParsed.data },
      select: {
        id: true,
        type: true,
        expenseDate: true,
        amountCents: true,
        deletedAt: true,
        compensationId: true,
      },
    })
    if (!expense) return { ok: false, error: "Spesa non trovata" }
    if (!expense.deletedAt) {
      return {
        ok: false,
        error: "Sposta prima nel cestino, poi elimina definitivamente",
      }
    }

    const expectedISO = expense.expenseDate.toISOString().slice(0, 10)
    if (confirmDate.trim() !== expectedISO) {
      return {
        ok: false,
        error: `Data di conferma non corrisponde (attesa ${expectedISO})`,
      }
    }

    if (expense.compensationId) {
      return { ok: false, error: COMPLIANCE_BLOCK_COMPENSATION }
    }

    await prisma.expense.delete({ where: { id: expense.id } })

    await prisma.auditLog.create({
      data: {
        userId,
        action: AuditAction.HARD_DELETE_EXPENSE,
        entityType: "Expense",
        entityId: expense.id,
        changes: {
          type: expense.type,
          date: expectedISO,
          amountCents: expense.amountCents,
        },
      },
    })

    revalidatePath(CESTINO_PATH)
    revalidatePath("/admin/expenses")
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

export async function hardDeleteMedicalCertificate(
  certId: string,
  confirmAthleteName: string,
): Promise<ActionResult> {
  const { userId } = await requireAdmin()

  const idParsed = uuidSchema.safeParse(certId)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo certificato non valido" }
  }

  try {
    const cert = await prisma.medicalCertificate.findUnique({
      where: { id: idParsed.data },
      select: {
        id: true,
        athleteId: true,
        filePath: true,
        deletedAt: true,
        athlete: { select: { firstName: true, lastName: true } },
      },
    })
    if (!cert) return { ok: false, error: "Certificato non trovato" }
    if (!cert.deletedAt) {
      return {
        ok: false,
        error: "Sposta prima nel cestino, poi elimina definitivamente",
      }
    }

    const expected = `${cert.athlete.firstName} ${cert.athlete.lastName}`
    if (normalizeName(confirmAthleteName) !== normalizeName(expected)) {
      return {
        ok: false,
        error: "Nome allieva di conferma non corrisponde",
      }
    }

    if (cert.filePath) {
      await deleteMedicalCertFile(cert.filePath)
    }

    await prisma.medicalCertificate.delete({ where: { id: cert.id } })

    await prisma.auditLog.create({
      data: {
        userId,
        action: AuditAction.HARD_DELETE_MEDICAL_CERT,
        entityType: "MedicalCertificate",
        entityId: cert.id,
        changes: {
          athleteId: cert.athleteId,
          athleteName: expected,
          fileRemoved: !!cert.filePath,
        },
      },
    })

    revalidatePath(CESTINO_PATH)
    revalidatePath(`/admin/athletes/${cert.athleteId}`)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}
