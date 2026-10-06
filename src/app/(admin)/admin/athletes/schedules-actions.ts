"use server"

import { revalidatePath } from "next/cache"

import { AuditAction, Prisma, ScheduleStatus } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"
import { eurToCents } from "@/lib/payments/collection-plan"
import {
  SCHEDULE_LINE_SELECT,
  athleteIdOfSchedule,
  describeScheduleAdmin,
} from "@/lib/payments/schedule-lines"
import type { ActionResult } from "@/lib/schemas/common"
import { uuidSchema } from "@/lib/schemas/common"
import {
  scheduleAmountSchema,
  waiveScheduleSchema,
  type ScheduleAmountValues,
  type WaiveScheduleValues,
} from "@/lib/schemas/payment-schedule"
import { logError } from "@/lib/logging/log-error"
import { GENERIC_ERROR_MESSAGE } from "@/lib/errors"

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
  logError("[schedules action] unexpected error", error)
  return GENERIC_ERROR_MESSAGE
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

  // deletedAt: null — una rata annullata (iscrizione sbagliata o mese dopo il
  // ritiro) non esiste più per la famiglia: non si condona e non si riapre
  const existing = await prisma.paymentSchedule.findFirst({
    where: { id: idParsed.data, deletedAt: null },
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
            schedule: describeScheduleAdmin(existing),
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

  // deletedAt: null — una rata annullata (iscrizione sbagliata o mese dopo il
  // ritiro) non esiste più per la famiglia: non si condona e non si riapre
  const existing = await prisma.paymentSchedule.findFirst({
    where: { id: idParsed.data, deletedAt: null },
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
            schedule: describeScheduleAdmin(existing),
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

// Modifica dell'importo di una scadenza non pagata, nei due versi.
//
// Il blocco all'incasso sopra l'importo della scadenza resta dov'è: protegge
// dagli errori di battitura. Chi deve incassare più del dovuto passa da qui
// prima, e quella correzione lascia una riga di audit col prima, il dopo e il
// motivo — l'incasso no.
export async function updateScheduleAmount(
  scheduleId: string,
  values: ScheduleAmountValues,
): Promise<ActionResult<{ amountCents: number }>> {
  const { userId } = await requireAdmin()

  const idParsed = uuidSchema.safeParse(scheduleId)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo scadenza non valido" }
  }

  const parsed = scheduleAmountSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    }
  }

  const existing = await prisma.paymentSchedule.findFirst({
    where: { id: idParsed.data, deletedAt: null },
    select: {
      id: true,
      amountCents: true,
      status: true,
      feeType: true,
      dueDate: true,
      paymentId: true,
      courseEnrollment: { select: { athleteId: true } },
      athleteId: true,
    },
  })
  if (!existing) {
    return { ok: false, error: "Scadenza non trovata" }
  }

  // Una scadenza pagata non si ritocca: l'importo è quello che è stato
  // incassato, e cambiarlo scollerebbe la contabilità dal pagamento. Si
  // storna il pagamento e si ricomincia.
  if (existing.status === ScheduleStatus.PAID || existing.paymentId !== null) {
    return {
      ok: false,
      error:
        "Questa scadenza è già pagata: per cambiarne l'importo storna prima il pagamento.",
    }
  }

  const amountCents = eurToCents(parsed.data.amountEur)
  if (amountCents <= 0) {
    return { ok: false, error: "L'importo deve essere maggiore di zero" }
  }
  if (amountCents === existing.amountCents) {
    return {
      ok: false,
      error: "L'importo è già questo: non c'è niente da cambiare.",
    }
  }

  const athleteId = existing.courseEnrollment?.athleteId ?? existing.athleteId

  try {
    await prisma.$transaction([
      prisma.paymentSchedule.update({
        where: { id: existing.id },
        data: { amountCents },
      }),
      prisma.auditLog.create({
        data: {
          userId,
          action: AuditAction.SCHEDULE_AMOUNT_UPDATE,
          entityType: "PaymentSchedule",
          entityId: existing.id,
          changes: {
            athleteId,
            feeType: existing.feeType,
            dueDate: existing.dueDate.toISOString().slice(0, 10),
            amountCentsBefore: existing.amountCents,
            amountCentsAfter: amountCents,
            reason: parsed.data.reason,
          },
        },
      }),
    ])

    if (athleteId) revalidatePath(athletePath(athleteId))
    revalidatePath("/admin/scadenze")
    return { ok: true, data: { amountCents } }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}
