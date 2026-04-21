"use server"

import { revalidatePath } from "next/cache"

import { Prisma, ScheduleStatus } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"
import type { ActionResult } from "@/lib/schemas/common"
import { uuidSchema } from "@/lib/schemas/common"
import {
  waiveScheduleSchema,
  type WaiveScheduleValues,
} from "@/lib/schemas/payment-schedule"

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

export async function waiveSchedule(
  scheduleId: string,
  values: WaiveScheduleValues,
): Promise<ActionResult> {
  await requireAdmin()

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
    select: {
      status: true,
      courseEnrollment: { select: { athleteId: true } },
    },
  })
  if (!existing) {
    return { ok: false, error: "Scadenza non trovata" }
  }
  if (existing.status === ScheduleStatus.PAID) {
    return { ok: false, error: "Una scadenza già pagata non può essere esentata" }
  }
  if (existing.status === ScheduleStatus.WAIVED) {
    return { ok: false, error: "Scadenza già esentata" }
  }

  try {
    await prisma.paymentSchedule.update({
      where: { id: idParsed.data },
      data: {
        status: ScheduleStatus.WAIVED,
        waiverReason: parsed.data.waiverReason,
      },
    })
    revalidatePath(athletePath(existing.courseEnrollment.athleteId))
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

export async function unwaiveSchedule(
  scheduleId: string,
): Promise<ActionResult> {
  await requireAdmin()

  const idParsed = uuidSchema.safeParse(scheduleId)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo scadenza non valido" }
  }

  const existing = await prisma.paymentSchedule.findUnique({
    where: { id: idParsed.data },
    select: {
      status: true,
      courseEnrollment: { select: { athleteId: true } },
    },
  })
  if (!existing) {
    return { ok: false, error: "Scadenza non trovata" }
  }
  if (existing.status !== ScheduleStatus.WAIVED) {
    return { ok: false, error: "La scadenza non è esentata" }
  }

  try {
    await prisma.paymentSchedule.update({
      where: { id: idParsed.data },
      data: {
        status: ScheduleStatus.DUE,
        waiverReason: null,
      },
    })
    revalidatePath(athletePath(existing.courseEnrollment.athleteId))
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}
