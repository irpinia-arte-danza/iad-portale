"use server"

import { revalidatePath } from "next/cache"

import { AuditAction, Prisma, ScheduleStatus } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"
import {
  SCHEDULE_LINE_SELECT,
  athleteIdOfSchedule,
  describeSchedule,
} from "@/lib/payments/schedule-lines"
import type { ActionResult } from "@/lib/schemas/common"
import { uuidSchema } from "@/lib/schemas/common"
import {
  waiveScheduleSchema,
  type WaiveScheduleValues,
} from "@/lib/schemas/payment-schedule"

const SCHEDULE_FOR_WAIVER_SELECT = {
  ...SCHEDULE_LINE_SELECT,
  waiverReason: true,
} satisfies Prisma.PaymentScheduleSelect

function athletePath(athleteId: string) {
  return `/admin/athletes/${athleteId}`
}

function mapPrismaError(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") return "Scadenza non trovata"
  }
  console.error("[schedules action] unexpected error", error)
  return "Errore interno, riprova"
}

// Colonna @db.Date: giorno UTC
function dateOnlyIso(date: Date): string {
  return new Date(date).toISOString().slice(0, 10)
}

export async function waiveSchedule(
  scheduleId: string,
  values: WaiveScheduleValues,
): Promise<ActionResult> {
  const { userId } = await requireAdmin()

  const idParsed = uuidSchema.safeParse(scheduleId)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo scadenza non valido" }
  }

  const parsed = waiveScheduleSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    }
  }

  const existing = await prisma.paymentSchedule.findUnique({
    where: { id: idParsed.data },
    select: SCHEDULE_FOR_WAIVER_SELECT,
  })
  if (!existing) {
    return { ok: false, error: "Scadenza non trovata" }
  }
  if (existing.status === ScheduleStatus.PAID) {
    return {
      ok: false,
      error: "Una scadenza già pagata non può essere segnata come non dovuta",
    }
  }
  if (existing.status === ScheduleStatus.WAIVED) {
    return { ok: false, error: "La scadenza è già segnata come non dovuta" }
  }

  try {
    await prisma.$transaction([
      prisma.paymentSchedule.update({
        where: { id: idParsed.data },
        data: {
          status: ScheduleStatus.WAIVED,
          waiverReason: parsed.data.waiverReason,
        },
      }),
      // Resta traccia di chi, quando e perché la quota non è dovuta
      // (valore WAIVED nel database, "Non dovuta" nelle etichette)
      prisma.auditLog.create({
        data: {
          userId,
          action: AuditAction.UPDATE,
          entityType: "PaymentSchedule",
          entityId: idParsed.data,
          changes: {
            change: "WAIVE",
            schedule: describeSchedule(existing),
            amountCents: existing.amountCents,
            dueDate: dateOnlyIso(existing.dueDate),
            fromStatus: existing.status,
            waiverReason: parsed.data.waiverReason,
          },
        },
      }),
    ])
    const athleteId = athleteIdOfSchedule(existing)
    if (athleteId) revalidatePath(athletePath(athleteId))
    revalidatePath("/admin/scadenze")
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

export async function unwaiveSchedule(
  scheduleId: string,
): Promise<ActionResult> {
  const { userId } = await requireAdmin()

  const idParsed = uuidSchema.safeParse(scheduleId)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo scadenza non valido" }
  }

  const existing = await prisma.paymentSchedule.findUnique({
    where: { id: idParsed.data },
    select: SCHEDULE_FOR_WAIVER_SELECT,
  })
  if (!existing) {
    return { ok: false, error: "Scadenza non trovata" }
  }
  if (existing.status !== ScheduleStatus.WAIVED) {
    return { ok: false, error: "La scadenza non è segnata come non dovuta" }
  }

  try {
    await prisma.$transaction([
      prisma.paymentSchedule.update({
        where: { id: idParsed.data },
        data: {
          status: ScheduleStatus.DUE,
          waiverReason: null,
        },
      }),
      prisma.auditLog.create({
        data: {
          userId,
          action: AuditAction.UPDATE,
          entityType: "PaymentSchedule",
          entityId: idParsed.data,
          changes: {
            change: "UNWAIVE",
            schedule: describeSchedule(existing),
            amountCents: existing.amountCents,
            dueDate: dateOnlyIso(existing.dueDate),
            previousWaiverReason: existing.waiverReason,
          },
        },
      }),
    ])
    const athleteId = athleteIdOfSchedule(existing)
    if (athleteId) revalidatePath(athletePath(athleteId))
    revalidatePath("/admin/scadenze")
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}
