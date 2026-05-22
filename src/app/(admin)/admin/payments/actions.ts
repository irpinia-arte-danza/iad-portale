"use server"

import { revalidatePath } from "next/cache"

import { FeeType, PaymentStatus, Prisma, ScheduleStatus } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"
import type { ActionResult } from "@/lib/schemas/common"
import { uuidSchema } from "@/lib/schemas/common"
import {
  paymentCreateSchema,
  paymentReverseSchema,
  paymentUpdateSchema,
  type PaymentCreateValues,
  type PaymentReverseValues,
  type PaymentUpdateValues,
} from "@/lib/schemas/payment"

import { getPaymentById, type PaymentWithRelations } from "./queries"

function mapPrismaError(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return "Pagamento duplicato"
    if (error.code === "P2003") return "Riferimento a record inesistente"
    if (error.code === "P2025") return "Pagamento non trovato"
  }
  console.error("[payments action] unexpected error", error)
  return "Errore interno, riprova"
}

function athletePath(athleteId: string) {
  return `/admin/athletes/${athleteId}`
}

function emptyToNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null) return null
  const trimmed = value.trim()
  return trimmed === "" ? null : trimmed
}

function monthBoundsUTC(date: Date): { start: Date; nextStart: Date } {
  const y = date.getUTCFullYear()
  const m = date.getUTCMonth()
  return {
    start: new Date(Date.UTC(y, m, 1)),
    nextStart: new Date(Date.UTC(y, m + 1, 1)),
  }
}

export async function getPaymentDetail(
  id: string,
): Promise<ActionResult<{ payment: PaymentWithRelations }>> {
  const idParsed = uuidSchema.safeParse(id)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo non valido" }
  }

  try {
    const payment = await getPaymentById(idParsed.data)
    if (!payment) {
      return { ok: false, error: "Pagamento non trovato" }
    }
    return { ok: true, data: { payment } }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

export async function registerPayment(
  values: PaymentCreateValues,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin()

  const parsed = paymentCreateSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    }
  }

  const [currentAY, currentFY, athlete] = await Promise.all([
    prisma.academicYear.findFirst({
      where: { isCurrent: true },
      select: { id: true },
    }),
    prisma.fiscalYear.findFirst({
      where: { isCurrent: true },
      select: { id: true },
    }),
    prisma.athlete.findUnique({
      where: { id: parsed.data.athleteId, deletedAt: null },
      select: { id: true },
    }),
  ])

  if (!currentAY) {
    return { ok: false, error: "Nessun anno accademico corrente configurato" }
  }
  if (!currentFY) {
    return { ok: false, error: "Nessun anno fiscale corrente configurato" }
  }
  if (!athlete) {
    return { ok: false, error: "Allieva non trovata" }
  }

  const parentId = emptyToNull(parsed.data.parentId)
  const courseEnrollmentId = emptyToNull(parsed.data.courseEnrollmentId)
  const stageEnrollmentId = emptyToNull(parsed.data.stageEnrollmentId)
  const showcaseParticipationId = emptyToNull(parsed.data.showcaseParticipationId)
  const costumeAssignmentId = emptyToNull(parsed.data.costumeAssignmentId)
  const paymentScheduleId = emptyToNull(parsed.data.paymentScheduleId)
  const amountCents = Math.round(parsed.data.amountEur * 100)

  const linkCount = [
    courseEnrollmentId,
    stageEnrollmentId,
    showcaseParticipationId,
    costumeAssignmentId,
  ].filter(Boolean).length
  if (linkCount > 1) {
    return {
      ok: false,
      error: "Indica un solo evento (corso, stage, saggio o costume)",
    }
  }

  const [
    parentRelation,
    courseEnrollment,
    stageEnrollment,
    showcaseParticipation,
    costumeAssignment,
    explicitSchedule,
  ] = await Promise.all([
    parentId
      ? prisma.athleteParent.findFirst({
          where: {
            athleteId: parsed.data.athleteId,
            parentId,
            parent: { deletedAt: null },
          },
          select: { id: true },
        })
      : Promise.resolve(null),
    courseEnrollmentId
      ? prisma.courseEnrollment.findFirst({
          where: {
            id: courseEnrollmentId,
            athleteId: parsed.data.athleteId,
            withdrawalDate: null,
            academicYear: { isCurrent: true },
            athlete: { deletedAt: null },
            course: { deletedAt: null },
          },
          select: { id: true },
        })
      : Promise.resolve(null),
    stageEnrollmentId
      ? prisma.stageEnrollment.findFirst({
          where: {
            id: stageEnrollmentId,
            athleteId: parsed.data.athleteId,
            stage: { deletedAt: null },
          },
          select: {
            id: true,
            paid: true,
            paymentSchedule: { select: { id: true } },
          },
        })
      : Promise.resolve(null),
    showcaseParticipationId
      ? prisma.showcaseParticipation.findFirst({
          where: {
            id: showcaseParticipationId,
            athleteId: parsed.data.athleteId,
            showcase: { deletedAt: null },
          },
          select: {
            id: true,
            confirmed: true,
            paymentSchedules: {
              where: { status: ScheduleStatus.DUE },
              select: {
                id: true,
                feeType: true,
                amountCents: true,
              },
              orderBy: { dueDate: "asc" },
            },
          },
        })
      : Promise.resolve(null),
    costumeAssignmentId
      ? prisma.costumeAssignment.findFirst({
          where: {
            id: costumeAssignmentId,
            participation: { athleteId: parsed.data.athleteId },
            costume: { deletedAt: null, showcase: { deletedAt: null } },
          },
          select: {
            id: true,
            paid: true,
            costume: { select: { id: true, name: true, costCents: true } },
            participation: {
              select: {
                id: true,
                athlete: { select: { firstName: true, lastName: true } },
              },
            },
            paymentSchedule: { select: { id: true, amountCents: true } },
          },
        })
      : Promise.resolve(null),
    paymentScheduleId
      ? prisma.paymentSchedule.findFirst({
          where: {
            id: paymentScheduleId,
            status: ScheduleStatus.DUE,
          },
          select: {
            id: true,
            feeType: true,
            amountCents: true,
            showcaseParticipationId: true,
            stageEnrollmentId: true,
            courseEnrollmentId: true,
            costumeAssignmentId: true,
          },
        })
      : Promise.resolve(null),
  ])

  if (parentId && !parentRelation) {
    return { ok: false, error: "Pagamento non valido per questa allieva" }
  }
  if (courseEnrollmentId && !courseEnrollment) {
    return { ok: false, error: "Pagamento non valido per questa allieva" }
  }
  if (stageEnrollmentId && !stageEnrollment) {
    return { ok: false, error: "Iscrizione stage non valida per questa allieva" }
  }
  if (stageEnrollment && stageEnrollment.paid) {
    return { ok: false, error: "Stage già pagato per questa allieva" }
  }
  if (showcaseParticipationId && !showcaseParticipation) {
    return {
      ok: false,
      error: "Partecipazione saggio non valida per questa allieva",
    }
  }
  if (showcaseParticipation && !showcaseParticipation.confirmed) {
    return {
      ok: false,
      error: "Partecipazione saggio non confermata: conferma prima il piano",
    }
  }
  if (showcaseParticipation && showcaseParticipation.paymentSchedules.length === 0) {
    return {
      ok: false,
      error: "Nessuna scadenza saggio in sospeso per questa allieva",
    }
  }
  if (costumeAssignmentId && !costumeAssignment) {
    return {
      ok: false,
      error: "Assegnazione costume non valida per questa allieva",
    }
  }
  if (costumeAssignment && costumeAssignment.paid) {
    return { ok: false, error: "Costume già pagato per questa allieva" }
  }
  if (costumeAssignment && !costumeAssignment.paymentSchedule) {
    return {
      ok: false,
      error:
        "Nessuna scadenza pagamento per questo costume (probabile costume gratuito)",
    }
  }
  if (costumeAssignment && parsed.data.feeType !== FeeType.COSTUME) {
    return {
      ok: false,
      error: "Tipo quota deve essere «Costume» per pagare un'assegnazione costume",
    }
  }

  // Risolvi quale schedule saggio chiudere
  let showcaseScheduleId: string | null = null
  if (showcaseParticipation) {
    if (paymentScheduleId) {
      const match = showcaseParticipation.paymentSchedules.find(
        (s) => s.id === paymentScheduleId,
      )
      if (!match) {
        return {
          ok: false,
          error: "La scadenza selezionata non appartiene alla partecipazione",
        }
      }
      showcaseScheduleId = match.id
    } else {
      // Auto-match per feeType: SHOWCASE_1 → caparra/quota unica, SHOWCASE_2 → saldo
      const match = showcaseParticipation.paymentSchedules.find(
        (s) => s.feeType === parsed.data.feeType,
      )
      if (!match) {
        return {
          ok: false,
          error: "Nessuna scadenza saggio in sospeso col tipo selezionato",
        }
      }
      showcaseScheduleId = match.id
    }
  } else if (explicitSchedule && explicitSchedule.showcaseParticipationId) {
    // Edge: passato paymentScheduleId di un saggio ma senza showcaseParticipationId
    return {
      ok: false,
      error:
        "Indica la partecipazione saggio insieme alla scadenza selezionata",
    }
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          athleteId: parsed.data.athleteId,
          parentId,
          courseEnrollmentId,
          academicYearId: currentAY.id,
          fiscalYearId: currentFY.id,
          feeType: parsed.data.feeType,
          amountCents,
          method: parsed.data.method,
          status: PaymentStatus.PAID,
          paymentDate: parsed.data.paymentDate,
          periodStart: parsed.data.periodStart ?? null,
          periodEnd: parsed.data.periodEnd ?? null,
          notes: emptyToNull(parsed.data.notes),
        },
        select: { id: true },
      })

      const canAutoMatch =
        courseEnrollmentId !== null &&
        parsed.data.feeType === FeeType.MONTHLY &&
        parsed.data.periodStart !== undefined

      if (canAutoMatch && parsed.data.periodStart) {
        const { start, nextStart } = monthBoundsUTC(parsed.data.periodStart)
        const candidates = await tx.paymentSchedule.findMany({
          where: {
            courseEnrollmentId: courseEnrollmentId!,
            feeType: FeeType.MONTHLY,
            status: ScheduleStatus.DUE,
            dueDate: { gte: start, lt: nextStart },
          },
          select: { id: true },
          take: 2,
        })
        if (candidates.length === 1) {
          await tx.paymentSchedule.update({
            where: { id: candidates[0].id },
            data: {
              paymentId: payment.id,
              status: ScheduleStatus.PAID,
            },
          })
        }
      }

      // Stage payment: marca enrollment PAID + chiude PaymentSchedule
      if (stageEnrollment) {
        await tx.stageEnrollment.update({
          where: { id: stageEnrollment.id },
          data: { paid: true, paymentId: payment.id },
        })
        if (stageEnrollment.paymentSchedule) {
          await tx.paymentSchedule.update({
            where: { id: stageEnrollment.paymentSchedule.id },
            data: {
              paymentId: payment.id,
              status: ScheduleStatus.PAID,
            },
          })
        }
      }

      // Showcase payment: chiude la PaymentSchedule selezionata (caparra/saldo/unica)
      if (showcaseScheduleId) {
        await tx.paymentSchedule.update({
          where: { id: showcaseScheduleId },
          data: {
            paymentId: payment.id,
            status: ScheduleStatus.PAID,
          },
        })
      }

      // Costume payment: marca assignment paid + chiude PaymentSchedule
      if (costumeAssignment) {
        await tx.costumeAssignment.update({
          where: { id: costumeAssignment.id },
          data: { paid: true, paymentId: payment.id },
        })
        if (costumeAssignment.paymentSchedule) {
          await tx.paymentSchedule.update({
            where: { id: costumeAssignment.paymentSchedule.id },
            data: {
              paymentId: payment.id,
              status: ScheduleStatus.PAID,
            },
          })
        }
      }

      return payment
    })

    revalidatePath("/admin/payments")
    revalidatePath(athletePath(parsed.data.athleteId))
    return { ok: true, data: { id: created.id } }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

export async function updatePayment(
  paymentId: string,
  values: PaymentUpdateValues,
): Promise<ActionResult> {
  await requireAdmin()

  const idParsed = uuidSchema.safeParse(paymentId)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo pagamento non valido" }
  }

  const parsed = paymentUpdateSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    }
  }

  const existing = await prisma.payment.findFirst({
    where: { id: idParsed.data, deletedAt: null },
    select: { athleteId: true },
  })
  if (!existing) {
    return { ok: false, error: "Pagamento non trovato" }
  }

  try {
    await prisma.payment.update({
      where: { id: idParsed.data },
      data: { notes: emptyToNull(parsed.data.notes) },
    })
    revalidatePath("/admin/payments")
    revalidatePath(athletePath(existing.athleteId))
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

export async function deletePayment(
  paymentId: string,
): Promise<ActionResult> {
  await requireAdmin()

  const idParsed = uuidSchema.safeParse(paymentId)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo pagamento non valido" }
  }

  const existing = await prisma.payment.findFirst({
    where: { id: idParsed.data, deletedAt: null },
    select: {
      athleteId: true,
      paymentSchedule: {
        select: { id: true, showcaseParticipationId: true },
      },
      stageEnrollment: { select: { id: true } },
      costumeAssignment: { select: { id: true } },
    },
  })
  if (!existing) {
    return { ok: false, error: "Pagamento non trovato" }
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (existing.paymentSchedule) {
        await tx.paymentSchedule.update({
          where: { id: existing.paymentSchedule.id },
          data: { paymentId: null, status: ScheduleStatus.DUE },
        })
      }
      if (existing.stageEnrollment) {
        await tx.stageEnrollment.update({
          where: { id: existing.stageEnrollment.id },
          data: { paid: false, paymentId: null },
        })
      }
      if (existing.costumeAssignment) {
        await tx.costumeAssignment.update({
          where: { id: existing.costumeAssignment.id },
          data: { paid: false, paymentId: null },
        })
      }
      await tx.payment.update({
        where: { id: idParsed.data },
        data: { deletedAt: new Date() },
      })
    })

    revalidatePath("/admin/payments")
    revalidatePath(athletePath(existing.athleteId))
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

export async function reversePayment(
  paymentId: string,
  values: PaymentReverseValues,
): Promise<ActionResult> {
  await requireAdmin()

  const idParsed = uuidSchema.safeParse(paymentId)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo pagamento non valido" }
  }

  const parsed = paymentReverseSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    }
  }

  const existing = await prisma.payment.findFirst({
    where: { id: idParsed.data, deletedAt: null },
    select: {
      athleteId: true,
      status: true,
      paymentSchedule: {
        select: { id: true, showcaseParticipationId: true },
      },
      stageEnrollment: { select: { id: true } },
      costumeAssignment: { select: { id: true } },
    },
  })
  if (!existing) {
    return { ok: false, error: "Pagamento non trovato" }
  }
  if (existing.status === PaymentStatus.REVERSED) {
    return { ok: false, error: "Pagamento già stornato" }
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (existing.paymentSchedule) {
        await tx.paymentSchedule.update({
          where: { id: existing.paymentSchedule.id },
          data: { paymentId: null, status: ScheduleStatus.DUE },
        })
      }
      if (existing.stageEnrollment) {
        await tx.stageEnrollment.update({
          where: { id: existing.stageEnrollment.id },
          data: { paid: false, paymentId: null },
        })
      }
      if (existing.costumeAssignment) {
        await tx.costumeAssignment.update({
          where: { id: existing.costumeAssignment.id },
          data: { paid: false, paymentId: null },
        })
      }

      await tx.payment.update({
        where: { id: idParsed.data },
        data: {
          status: PaymentStatus.REVERSED,
          reversalReason: parsed.data.reversalReason,
        },
      })
    })
    revalidatePath("/admin/payments")
    revalidatePath(athletePath(existing.athleteId))
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}
