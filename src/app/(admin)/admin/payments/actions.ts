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
  const amountCents = Math.round(parsed.data.amountEur * 100)

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
      paymentSchedule: { select: { id: true } },
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
    select: { athleteId: true, status: true },
  })
  if (!existing) {
    return { ok: false, error: "Pagamento non trovato" }
  }
  if (existing.status === PaymentStatus.REVERSED) {
    return { ok: false, error: "Pagamento già stornato" }
  }

  try {
    await prisma.payment.update({
      where: { id: idParsed.data },
      data: {
        status: PaymentStatus.REVERSED,
        reversalReason: parsed.data.reversalReason,
      },
    })
    revalidatePath("/admin/payments")
    revalidatePath(athletePath(existing.athleteId))
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}
