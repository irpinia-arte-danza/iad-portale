"use server"

import { revalidatePath } from "next/cache"

import { AthleteStatus, AuditAction, Prisma } from "@prisma/client"

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
import {
  checkCancelEnrollment,
  splitSchedulesOnWithdrawal,
  sumCents,
  type RuleSchedule,
} from "@/lib/enrollments/enrollment-rules"
import {
  AssociationFeeNotSetError,
  ensureAssociationFeeSchedule,
} from "@/lib/fees/association-fee"
import { toDateOnly } from "@/lib/utils/date-only"

import { generateMonthlySchedulesForEnrollment } from "./schedule-generator"

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
    select: { id: true, label: true, associationFeeCents: true },
  })
  if (!currentAY) {
    return { ok: false, error: "Nessun anno accademico corrente configurato" }
  }

  const course = await prisma.course.findFirst({
    where: { id: parsed.data.courseId, deletedAt: null },
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
          enrollmentDate: toDateOnly(parsed.data.enrollmentDate ?? new Date()),
          notes:
            parsed.data.notes && parsed.data.notes !== ""
              ? parsed.data.notes
              : null,
        },
        select: { id: true, enrollmentDate: true },
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

      await generateMonthlySchedulesForEnrollment(
        tx,
        enrollment.id,
        adminUserId,
      )

      // Una quota associativa per allieva per anno: al secondo corso non si
      // ripete. Importo non impostato → errore e iscrizione annullata.
      await ensureAssociationFeeSchedule(tx, {
        athleteId: athleteIdParsed.data,
        academicYear: currentAY,
        dueDate: enrollment.enrollmentDate,
        createdBy: adminUserId,
      })

      return enrollment.id
    })

    revalidatePath(athletePath(athleteIdParsed.data))
    revalidatePath("/admin/scadenze")
    return { ok: true, data: { id: enrollmentId } }
  } catch (error) {
    if (error instanceof AssociationFeeNotSetError) {
      return { ok: false, error: error.message }
    }
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

  // deletedAt: null — un'iscrizione annullata non si modifica
  const existing = await prisma.courseEnrollment.findFirst({
    where: { id: idParsed.data, deletedAt: null },
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

// Rate dell'iscrizione nella forma che vogliono le regole pure
const RULE_SCHEDULE_SELECT = {
  id: true,
  dueDate: true,
  status: true,
  amountCents: true,
} as const

async function loadEnrollmentForChange(enrollmentId: string) {
  return prisma.courseEnrollment.findFirst({
    where: { id: enrollmentId, deletedAt: null },
    select: {
      id: true,
      athleteId: true,
      courseId: true,
      academicYearId: true,
      withdrawalDate: true,
      course: { select: { name: true } },
      academicYear: { select: { label: true } },
      paymentSchedules: {
        where: { deletedAt: null },
        select: RULE_SCHEDULE_SELECT,
      },
    },
  })
}

export async function withdrawEnrollment(
  enrollmentId: string,
  values: WithdrawEnrollmentValues,
): Promise<ActionResult<{ removedCount: number }>> {
  const { userId: adminUserId } = await requireAdmin()

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

  const existing = await loadEnrollmentForChange(idParsed.data)
  if (!existing) {
    return { ok: false, error: "Iscrizione non trovata" }
  }

  const withdrawalDate = toDateOnly(parsed.data.withdrawalDate)
  // Restano dovuti i mesi frequentati, va via il resto. Prima il ritiro
  // scriveva solo la data e lasciava dovute tutte le rate, giugno compreso.
  const { remove } = splitSchedulesOnWithdrawal(
    existing.paymentSchedules as RuleSchedule[],
    withdrawalDate,
  )

  try {
    const now = new Date()
    await prisma.$transaction(async (tx) => {
      await tx.courseEnrollment.update({
        where: { id: existing.id },
        data: { withdrawalDate },
      })

      if (remove.length > 0) {
        await tx.paymentSchedule.updateMany({
          where: { id: { in: remove.map((r) => r.id) }, deletedAt: null },
          data: { deletedAt: now },
        })
      }

      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: AuditAction.ENROLLMENT_WITHDRAW,
          entityType: "CourseEnrollment",
          entityId: existing.id,
          changes: {
            athleteId: existing.athleteId,
            course: existing.course.name,
            withdrawalDate: withdrawalDate.toISOString().slice(0, 10),
            removedSchedules: remove.length,
            removedCents: sumCents(remove),
          },
        },
      })
    })

    revalidatePath(athletePath(existing.athleteId))
    revalidatePath("/admin/scadenze")
    return { ok: true, data: { removedCount: remove.length } }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

// Il contributo di iscrizione annuale è appeso all'allieva, non al corso: se
// resta un altro corso attivo nell'anno non si tocca. Si porta via solo
// quando l'iscrizione annullata era l'ultima dell'anno, il contributo non è
// pagato e non c'è nient'altro che richieda di essere socia.
async function associationFeeToCancel(
  tx: Prisma.TransactionClient,
  params: { athleteId: string; academicYearId: string; enrollmentId: string },
): Promise<{ id: string; amountCents: number } | null> {
  const otherActive = await tx.courseEnrollment.count({
    where: {
      athleteId: params.athleteId,
      academicYearId: params.academicYearId,
      deletedAt: null,
      id: { not: params.enrollmentId },
    },
  })
  if (otherActive > 0) return null

  const [stages, showcases] = await Promise.all([
    tx.stageEnrollment.count({
      where: {
        athleteId: params.athleteId,
        stage: { deletedAt: null, academicYearId: params.academicYearId },
      },
    }),
    tx.showcaseParticipation.count({
      where: {
        athleteId: params.athleteId,
        showcase: { deletedAt: null, academicYearId: params.academicYearId },
      },
    }),
  ])
  // Stage o saggio nell'anno: è socia per quelli, il contributo resta dovuto
  if (stages > 0 || showcases > 0) return null

  const fee = await tx.paymentSchedule.findFirst({
    where: {
      athleteId: params.athleteId,
      academicYearId: params.academicYearId,
      feeType: "ASSOCIATION",
      deletedAt: null,
    },
    select: { id: true, status: true, amountCents: true },
  })
  // Pagato: non si tocca, come qualsiasi altra rata pagata
  if (!fee || fee.status === "PAID") return null

  return { id: fee.id, amountCents: fee.amountCents }
}

export type CancelEnrollmentPreview = {
  courseName: string
  academicYearLabel: string
  wasWithdrawn: boolean
  // Rate che verrebbero eliminate, e quanto valgono
  removableCount: number
  removableCents: number
  // Contributo di iscrizione annuale che verrebbe eliminato con lei
  associationFee: { label: string; amountCents: number } | null
  // Se valorizzato l'annullamento è vietato: c'è una rata pagata
  blocker: string | null
}

// Cosa succederebbe annullando: lo calcola il server con le stesse funzioni
// che poi eseguono l'operazione, così il dialog non può promettere una cosa
// e l'azione farne un'altra.
export async function getCancelEnrollmentPreview(
  enrollmentId: string,
): Promise<ActionResult<CancelEnrollmentPreview>> {
  await requireAdmin()

  const idParsed = uuidSchema.safeParse(enrollmentId)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo iscrizione non valido" }
  }

  const existing = await loadEnrollmentForChange(idParsed.data)
  if (!existing) return { ok: false, error: "Iscrizione non trovata" }

  const check = checkCancelEnrollment(
    existing.paymentSchedules as RuleSchedule[],
  )
  const fee = check.ok
    ? await associationFeeToCancel(prisma, {
        athleteId: existing.athleteId,
        academicYearId: existing.academicYearId,
        enrollmentId: existing.id,
      })
    : null

  return {
    ok: true,
    data: {
      courseName: existing.course.name,
      academicYearLabel: existing.academicYear.label,
      wasWithdrawn: existing.withdrawalDate !== null,
      removableCount: check.ok ? check.removable.length : 0,
      removableCents: check.ok ? sumCents(check.removable) : 0,
      associationFee: fee
        ? {
            label: existing.academicYear.label,
            amountCents: fee.amountCents,
          }
        : null,
      blocker: check.ok ? null : check.message,
    },
  }
}

// Annulla un'iscrizione inserita per errore: sparisce con le sue rate non
// pagate, e l'allieva può reiscriversi allo stesso corso (l'indice unico è
// parziale su deleted_at). Funziona anche su un'iscrizione già ritirata: è il
// modo per correggere un errore che era stato "chiuso" con Ritira.
export async function cancelEnrollment(
  enrollmentId: string,
): Promise<ActionResult<{ removedSchedules: number; feeRemoved: boolean }>> {
  const { userId: adminUserId } = await requireAdmin()

  const idParsed = uuidSchema.safeParse(enrollmentId)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo iscrizione non valido" }
  }

  const existing = await loadEnrollmentForChange(idParsed.data)
  if (!existing) {
    return { ok: false, error: "Iscrizione non trovata" }
  }

  // Il controllo si rifà qui: quello che ha visto il browser non fa fede
  const check = checkCancelEnrollment(
    existing.paymentSchedules as RuleSchedule[],
  )
  if (!check.ok) {
    return { ok: false, error: check.message }
  }

  try {
    const now = new Date()
    const feeRemoved = await prisma.$transaction(async (tx) => {
      // Stesso istante su iscrizione e rate: è così che il ripristino dal
      // Cestino sa quali rate tornano con lei e quali erano già state
      // annullate prima, da un ritiro
      await tx.courseEnrollment.update({
        where: { id: existing.id },
        data: { deletedAt: now },
      })

      if (check.removable.length > 0) {
        await tx.paymentSchedule.updateMany({
          where: {
            id: { in: check.removable.map((r) => r.id) },
            deletedAt: null,
            status: { not: "PAID" },
          },
          data: { deletedAt: now },
        })
      }

      const fee = await associationFeeToCancel(tx, {
        athleteId: existing.athleteId,
        academicYearId: existing.academicYearId,
        enrollmentId: existing.id,
      })
      if (fee) {
        await tx.paymentSchedule.update({
          where: { id: fee.id },
          data: { deletedAt: now },
        })
      }

      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: AuditAction.ENROLLMENT_CANCEL,
          entityType: "CourseEnrollment",
          entityId: existing.id,
          changes: {
            athleteId: existing.athleteId,
            course: existing.course.name,
            academicYear: existing.academicYear.label,
            wasWithdrawn: existing.withdrawalDate !== null,
            removedSchedules: check.removable.length,
            removedCents: sumCents(check.removable),
            associationFeeRemoved: fee ? fee.amountCents : null,
          },
        },
      })

      return fee !== null
    })

    revalidatePath(athletePath(existing.athleteId))
    revalidatePath("/admin/scadenze")
    revalidatePath("/admin/cestino")
    return {
      ok: true,
      data: { removedSchedules: check.removable.length, feeRemoved },
    }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}
