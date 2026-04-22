"use server"

import { revalidatePath } from "next/cache"

import { AuditAction, Prisma, ScheduleStatus } from "@prisma/client"

import { requireAdmin } from "@/lib/auth/require-admin"
import { prisma } from "@/lib/prisma"
import type { ActionResult } from "@/lib/schemas/common"
import {
  reminderConfigSchema,
  type ReminderConfigValues,
} from "@/lib/schemas/reminder-config"

import { diffChanges } from "./audit-helpers"

const SETTINGS_PATH = "/admin/settings"

export type MilestoneKey =
  | "PROMEMORIA_DUE"
  | "SOLLECITO_FIRST"
  | "SOLLECITO_SECOND"

type MilestonePreview = {
  key: MilestoneKey
  label: string
  templateSlug: string
  dueOffsetDays: number // negativo = pre-scadenza, positivo = post
  count: number
  topRecipients: string[] // prime 5 recipient names
  missingEmailCount: number
}

export type CronPreview = {
  todayUTC: string // YYYY-MM-DD
  isWeekendBlocked: boolean
  enabled: boolean
  totalCount: number
  milestones: MilestonePreview[]
}

export async function getReminderConfig(): Promise<ReminderConfigValues> {
  await requireAdmin()
  const cfg = await prisma.reminderConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {},
  })
  return {
    enabled: cfg.enabled,
    daysBeforeDue: cfg.daysBeforeDue,
    firstReminderDaysAfter: cfg.firstReminderDaysAfter,
    secondReminderDaysAfter: cfg.secondReminderDaysAfter,
    excludeWeekends: cfg.excludeWeekends,
  }
}

export async function updateReminderConfig(
  values: ReminderConfigValues,
): Promise<ActionResult> {
  const { userId } = await requireAdmin()

  const parsed = reminderConfigSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    }
  }

  try {
    const before = await prisma.reminderConfig.upsert({
      where: { id: 1 },
      update: {},
      create: {},
    })

    const after = await prisma.reminderConfig.update({
      where: { id: 1 },
      data: {
        enabled: parsed.data.enabled,
        daysBeforeDue: parsed.data.daysBeforeDue,
        firstReminderDaysAfter: parsed.data.firstReminderDaysAfter,
        secondReminderDaysAfter: parsed.data.secondReminderDaysAfter,
        excludeWeekends: parsed.data.excludeWeekends,
        updatedBy: userId,
      },
    })

    const changes = diffChanges(
      {
        enabled: before.enabled,
        daysBeforeDue: before.daysBeforeDue,
        firstReminderDaysAfter: before.firstReminderDaysAfter,
        secondReminderDaysAfter: before.secondReminderDaysAfter,
        excludeWeekends: before.excludeWeekends,
      },
      {
        enabled: after.enabled,
        daysBeforeDue: after.daysBeforeDue,
        firstReminderDaysAfter: after.firstReminderDaysAfter,
        secondReminderDaysAfter: after.secondReminderDaysAfter,
        excludeWeekends: after.excludeWeekends,
      },
    )

    if (Object.keys(changes).length > 0) {
      try {
        await prisma.auditLog.create({
          data: {
            userId,
            action: AuditAction.UPDATE,
            entityType: "ReminderConfig",
            entityId: String(after.id),
            changes: changes as Prisma.InputJsonValue,
          },
        })
      } catch (err) {
        console.error("[audit] ReminderConfig update failed", err)
      }
    }

    revalidatePath(SETTINGS_PATH)
    return { ok: true }
  } catch (err) {
    console.error("[reminder-config] update failed", err)
    return { ok: false, error: "Errore di salvataggio" }
  }
}

function startOfUTCToday(): Date {
  const now = new Date()
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  )
}

function addDaysUTC(base: Date, days: number): Date {
  const d = new Date(base)
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

function formatYMD(d: Date): string {
  return d.toISOString().slice(0, 10)
}

const MILESTONE_TEMPLATE: Record<MilestoneKey, string> = {
  PROMEMORIA_DUE: "promemoria-scadenza",
  SOLLECITO_FIRST: "sollecito-scadenza",
  SOLLECITO_SECOND: "sollecito-scadenza",
}

const MILESTONE_LABEL: Record<MilestoneKey, string> = {
  PROMEMORIA_DUE: "Promemoria pre-scadenza",
  SOLLECITO_FIRST: "Primo sollecito",
  SOLLECITO_SECOND: "Secondo sollecito",
}

export async function previewCronReminders(): Promise<CronPreview> {
  await requireAdmin()

  const cfg = await prisma.reminderConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {},
  })

  const today = startOfUTCToday()
  const dow = today.getUTCDay() // 0=Dom, 6=Sab
  const isWeekend = dow === 0 || dow === 6
  const isWeekendBlocked = cfg.excludeWeekends && isWeekend

  const milestones: Array<{
    key: MilestoneKey
    dueOffset: number
    targetDueDate: Date
  }> = [
    {
      key: "PROMEMORIA_DUE",
      dueOffset: cfg.daysBeforeDue,
      targetDueDate: addDaysUTC(today, cfg.daysBeforeDue),
    },
    {
      key: "SOLLECITO_FIRST",
      dueOffset: -cfg.firstReminderDaysAfter,
      targetDueDate: addDaysUTC(today, -cfg.firstReminderDaysAfter),
    },
    {
      key: "SOLLECITO_SECOND",
      dueOffset: -cfg.secondReminderDaysAfter,
      targetDueDate: addDaysUTC(today, -cfg.secondReminderDaysAfter),
    },
  ]

  const previews: MilestonePreview[] = []
  let totalCount = 0

  for (const m of milestones) {
    const dayStart = new Date(m.targetDueDate)
    const dayEnd = addDaysUTC(m.targetDueDate, 1)

    const candidates = await prisma.paymentSchedule.findMany({
      where: {
        status: ScheduleStatus.DUE,
        dueDate: { gte: dayStart, lt: dayEnd },
      },
      include: {
        courseEnrollment: {
          select: {
            athlete: {
              select: {
                parentRelations: {
                  where: { parent: { deletedAt: null } },
                  orderBy: [
                    { isPrimaryPayer: "desc" },
                    { isPrimaryContact: "desc" },
                  ],
                  take: 1,
                  select: {
                    parent: {
                      select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })

    const candidateIds = candidates.map((c) => c.id)
    const alreadySent = await prisma.emailLog.findMany({
      where: {
        paymentScheduleId: { in: candidateIds },
        milestoneKey: m.key,
        status: { not: "FAILED" },
      },
      select: { paymentScheduleId: true },
    })
    const sentIds = new Set(
      alreadySent
        .map((e) => e.paymentScheduleId)
        .filter((v): v is string => v !== null),
    )

    const toSend = candidates.filter((c) => !sentIds.has(c.id))

    let missingEmailCount = 0
    const names: string[] = []
    for (const s of toSend) {
      const parent = s.courseEnrollment.athlete.parentRelations[0]?.parent
      if (!parent || !parent.email) {
        missingEmailCount++
        continue
      }
      if (names.length < 5) {
        names.push(`${parent.firstName} ${parent.lastName}`)
      }
    }

    const count = toSend.length - missingEmailCount
    totalCount += count

    previews.push({
      key: m.key,
      label: MILESTONE_LABEL[m.key],
      templateSlug: MILESTONE_TEMPLATE[m.key],
      dueOffsetDays: m.dueOffset,
      count,
      topRecipients: names,
      missingEmailCount,
    })
  }

  return {
    todayUTC: formatYMD(today),
    isWeekendBlocked,
    enabled: cfg.enabled,
    totalCount,
    milestones: previews,
  }
}
