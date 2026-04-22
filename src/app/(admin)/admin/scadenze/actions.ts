"use server"

import { revalidatePath } from "next/cache"

import {
  EmailCategory,
  EmailStatus,
  EmailTrigger,
  ScheduleStatus,
} from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"
import { renderTemplate } from "@/lib/resend/render-template"
import { sendBatch, type BatchItem } from "@/lib/resend/send-batch"
import { FEE_TYPE_LABELS } from "@/lib/schemas/payment"
import { formatMeseIt } from "@/lib/utils/format"

const DATE_IT = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

const CURRENCY_IT = new Intl.NumberFormat("it-IT", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function startOfUTCToday(): Date {
  const now = new Date()
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  )
}

export async function getScadenzeCSVData(
  scheduleIds: string[],
): Promise<{ headers: string[]; rows: string[][] }> {
  await requireAdmin()

  if (scheduleIds.length === 0) {
    return { headers: [], rows: [] }
  }

  const schedules = await prisma.paymentSchedule.findMany({
    where: {
      id: { in: scheduleIds },
      status: ScheduleStatus.DUE,
    },
    orderBy: { dueDate: "asc" },
    include: {
      courseEnrollment: {
        select: {
          course: { select: { name: true } },
          athlete: {
            select: {
              firstName: true,
              lastName: true,
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
                      phone: true,
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

  const emailAggregates = await prisma.emailLog.groupBy({
    by: ["paymentScheduleId"],
    where: { paymentScheduleId: { in: scheduleIds } },
    _count: { _all: true },
    _max: { sentAt: true },
  })

  const emailMap = new Map<string, { count: number; lastSent: Date | null }>()
  for (const agg of emailAggregates) {
    if (!agg.paymentScheduleId) continue
    emailMap.set(agg.paymentScheduleId, {
      count: agg._count._all,
      lastSent: agg._max.sentAt,
    })
  }

  const today = startOfUTCToday()

  const headers = [
    "Allieva",
    "Genitore",
    "Email",
    "Telefono",
    "Corso",
    "Importo",
    "Scadenza",
    "Giorni ritardo",
    "Ultimo sollecito",
    "Email inviate",
  ]

  const rows = schedules.map((s) => {
    const athlete = s.courseEnrollment.athlete
    const parent = athlete.parentRelations[0]?.parent ?? null
    const email = emailMap.get(s.id)

    const dueUTC = new Date(
      Date.UTC(
        s.dueDate.getUTCFullYear(),
        s.dueDate.getUTCMonth(),
        s.dueDate.getUTCDate(),
      ),
    )
    const giorniRitardo = Math.round(
      (today.getTime() - dueUTC.getTime()) / (1000 * 60 * 60 * 24),
    )

    return [
      `${athlete.lastName} ${athlete.firstName}`,
      parent ? `${parent.lastName} ${parent.firstName}` : "—",
      parent?.email ?? "",
      parent?.phone ?? "",
      s.courseEnrollment.course?.name ?? "—",
      CURRENCY_IT.format(s.amountCents / 100),
      DATE_IT.format(s.dueDate),
      String(giorniRitardo),
      email?.lastSent ? DATE_IT.format(email.lastSent) : "",
      String(email?.count ?? 0),
    ]
  })

  return { headers, rows }
}

export type ReminderTemplateOption = {
  slug: string
  name: string
  subject: string
  category: EmailCategory
}

export async function listReminderTemplates(): Promise<ReminderTemplateOption[]> {
  await requireAdmin()

  const templates = await prisma.emailTemplate.findMany({
    where: {
      isActive: true,
      category: { in: [EmailCategory.SOLLECITO, EmailCategory.PROMEMORIA] },
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    select: {
      slug: true,
      name: true,
      subject: true,
      category: true,
    },
  })

  return templates
}

export type ReminderPreview = {
  scheduleId: string
  recipientEmail: string | null
  recipientName: string
  athleteName: string
  subject: string
  bodyHtml: string
  bodyText: string | null
  warning?: string
}

export async function previewReminder(
  scheduleId: string,
  templateSlug: string,
): Promise<ReminderPreview> {
  await requireAdmin()

  const schedule = await prisma.paymentSchedule.findUnique({
    where: { id: scheduleId },
    include: {
      courseEnrollment: {
        select: {
          course: { select: { name: true } },
          athlete: {
            select: {
              firstName: true,
              lastName: true,
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

  if (!schedule) {
    throw new Error("Scadenza non trovata")
  }

  const athlete = schedule.courseEnrollment.athlete
  const parent = athlete.parentRelations[0]?.parent ?? null
  const athleteName = `${athlete.firstName} ${athlete.lastName}`
  const recipientName = parent
    ? `${parent.firstName} ${parent.lastName}`
    : athleteName

  const vars = {
    genitore_nome: recipientName,
    allieva_nome: athleteName,
    importo: (schedule.amountCents / 100).toLocaleString("it-IT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    data_scadenza: schedule.dueDate.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
    mese: formatMeseIt(schedule.dueDate),
    corso_nome: schedule.courseEnrollment.course?.name ?? "",
    tipo_quota: FEE_TYPE_LABELS[schedule.feeType] ?? "",
  }

  const rendered = await renderTemplate(templateSlug, vars)

  let warning: string | undefined
  if (!parent) {
    warning = "Nessun genitore collegato: questa scadenza verrà saltata."
  } else if (!parent.email) {
    warning = "Genitore senza email: questa scadenza verrà saltata."
  }

  return {
    scheduleId: schedule.id,
    recipientEmail: parent?.email ?? null,
    recipientName,
    athleteName,
    subject: rendered.subject,
    bodyHtml: rendered.bodyHtml,
    bodyText: rendered.bodyText,
    warning,
  }
}

export type SendReminderResult = {
  scheduleId: string
  recipientEmail: string
  recipientName: string
  status: "SENT" | "FAILED" | "SKIPPED"
  error?: string
  providerId?: string
}

export type SendReminderBatchResponse = {
  results: SendReminderResult[]
  summary: { sent: number; failed: number; skipped: number }
  transportError?: string
}

export async function sendReminderBatch(
  scheduleIds: string[],
  templateSlug: string,
): Promise<SendReminderBatchResponse> {
  const admin = await requireAdmin()

  if (scheduleIds.length === 0) {
    return {
      results: [],
      summary: { sent: 0, failed: 0, skipped: 0 },
    }
  }

  const schedules = await prisma.paymentSchedule.findMany({
    where: {
      id: { in: scheduleIds },
      status: ScheduleStatus.DUE,
    },
    orderBy: { dueDate: "asc" },
    include: {
      courseEnrollment: {
        select: {
          course: { select: { name: true } },
          athlete: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
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
                      id: true,
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

  type SendableItem = {
    scheduleId: string
    athleteId: string
    parentId: string
    recipientEmail: string
    recipientName: string
    subject: string
    html: string
    text: string | null
  }

  const results: SendReminderResult[] = []
  const sendable: SendableItem[] = []

  for (const s of schedules) {
    const athlete = s.courseEnrollment.athlete
    const parent = athlete.parentRelations[0]?.parent ?? null

    if (!parent || !parent.email) {
      results.push({
        scheduleId: s.id,
        recipientEmail: parent?.email ?? "",
        recipientName: parent
          ? `${parent.firstName} ${parent.lastName}`
          : `${athlete.firstName} ${athlete.lastName}`,
        status: "SKIPPED",
        error: parent
          ? "Genitore senza email"
          : "Nessun genitore collegato",
      })
      continue
    }

    const vars = {
      genitore_nome: `${parent.firstName} ${parent.lastName}`,
      allieva_nome: `${athlete.firstName} ${athlete.lastName}`,
      importo: (s.amountCents / 100).toLocaleString("it-IT", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      data_scadenza: s.dueDate.toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
      mese: formatMeseIt(s.dueDate),
      corso_nome: s.courseEnrollment.course?.name ?? "",
      tipo_quota: FEE_TYPE_LABELS[s.feeType] ?? "",
    }

    try {
      const rendered = await renderTemplate(templateSlug, vars)
      sendable.push({
        scheduleId: s.id,
        athleteId: athlete.id,
        parentId: parent.id,
        recipientEmail: parent.email,
        recipientName: `${parent.firstName} ${parent.lastName}`,
        subject: rendered.subject,
        html: rendered.bodyHtml,
        text: rendered.bodyText,
      })
    } catch (err) {
      results.push({
        scheduleId: s.id,
        recipientEmail: parent.email,
        recipientName: `${parent.firstName} ${parent.lastName}`,
        status: "FAILED",
        error: err instanceof Error ? err.message : "Errore rendering template",
      })
    }
  }

  let transportError: string | undefined
  if (sendable.length > 0) {
    const batchItems: BatchItem[] = sendable.map((item) => ({
      to: item.recipientEmail,
      subject: item.subject,
      html: item.html,
      text: item.text ?? undefined,
    }))

    const batchResponse = await sendBatch(batchItems)
    transportError = batchResponse.transportError

    const logPayload = sendable.map((item, idx) => {
      const outcome = batchResponse.results[idx]
      const ok = outcome?.success === true

      results.push({
        scheduleId: item.scheduleId,
        recipientEmail: item.recipientEmail,
        recipientName: item.recipientName,
        status: ok ? "SENT" : "FAILED",
        providerId: ok ? outcome.providerId : undefined,
        error: ok ? undefined : outcome?.error ?? "Errore invio",
      })

      return {
        sentBy: admin.userId,
        recipientEmail: item.recipientEmail,
        recipientName: item.recipientName,
        templateSlug,
        subject: item.subject,
        bodyHtml: item.html,
        bodyText: item.text,
        athleteId: item.athleteId,
        parentId: item.parentId,
        paymentScheduleId: item.scheduleId,
        status: ok ? EmailStatus.SENT : EmailStatus.FAILED,
        providerId: ok ? outcome.providerId : null,
        errorMessage: ok ? null : outcome?.error ?? "Errore invio",
        triggeredBy: EmailTrigger.ADMIN_MANUAL,
        milestoneKey: null,
      }
    })

    if (logPayload.length > 0) {
      await prisma.emailLog.createMany({ data: logPayload })
    }
  }

  const summary = results.reduce(
    (acc, r) => {
      if (r.status === "SENT") acc.sent += 1
      else if (r.status === "FAILED") acc.failed += 1
      else acc.skipped += 1
      return acc
    },
    { sent: 0, failed: 0, skipped: 0 },
  )

  revalidatePath("/admin/scadenze")
  revalidatePath("/admin/dashboard")

  return { results, summary, transportError }
}
