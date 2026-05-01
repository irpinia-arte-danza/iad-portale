import { NextResponse, type NextRequest } from "next/server"

import {
  EmailStatus,
  EmailTrigger,
  ScheduleStatus,
  UserRole,
} from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { renderTemplate } from "@/lib/resend/render-template"
import { sendBatch, type BatchItem } from "@/lib/resend/send-batch"
import { FEE_TYPE_LABELS } from "@/lib/schemas/payment"
import { formatMeseIt } from "@/lib/utils/format"
import { withActiveScheduleFilter } from "@/lib/queries/active-schedule-filter"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type MilestoneKey = "PROMEMORIA_DUE" | "SOLLECITO_FIRST" | "SOLLECITO_SECOND"

const MILESTONE_TEMPLATE: Record<MilestoneKey, string> = {
  PROMEMORIA_DUE: "promemoria-scadenza",
  SOLLECITO_FIRST: "sollecito-scadenza",
  SOLLECITO_SECOND: "sollecito-scadenza",
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

async function resolveSender(updatedBy: string | null): Promise<string | null> {
  if (updatedBy) {
    const exists = await prisma.user.findUnique({
      where: { id: updatedBy },
      select: { id: true, role: true, isActive: true },
    })
    if (exists && exists.role === UserRole.ADMIN && exists.isActive) {
      return exists.id
    }
  }
  const firstAdmin = await prisma.user.findFirst({
    where: { role: UserRole.ADMIN, isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  })
  return firstAdmin?.id ?? null
}

type CronStats = {
  milestone: MilestoneKey
  candidates: number
  skippedAlreadySent: number
  skippedNoEmail: number
  sent: number
  failed: number
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get("authorization")
  const isVercelCron = req.headers.get("x-vercel-cron") === "1"
  const secret = process.env.CRON_SECRET

  if (!secret) {
    console.error("[cron/reminders] CRON_SECRET not configured")
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET not configured" },
      { status: 500 },
    )
  }

  const authorized = isVercelCron || authHeader === `Bearer ${secret}`
  if (!authorized) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const cfg = await prisma.reminderConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {},
  })

  if (!cfg.enabled) {
    return NextResponse.json({ ok: true, skipped: "disabled", stats: [] })
  }

  const today = startOfUTCToday()
  const dow = today.getUTCDay()
  if (cfg.excludeWeekends && (dow === 0 || dow === 6)) {
    return NextResponse.json({ ok: true, skipped: "weekend", stats: [] })
  }

  const sender = await resolveSender(cfg.updatedBy)
  if (!sender) {
    console.error("[cron/reminders] no admin user available as sender")
    return NextResponse.json(
      { ok: false, error: "No admin sender available" },
      { status: 500 },
    )
  }

  const milestones: Array<{
    key: MilestoneKey
    targetDueDate: Date
  }> = [
    {
      key: "PROMEMORIA_DUE",
      targetDueDate: addDaysUTC(today, cfg.daysBeforeDue),
    },
    {
      key: "SOLLECITO_FIRST",
      targetDueDate: addDaysUTC(today, -cfg.firstReminderDaysAfter),
    },
    {
      key: "SOLLECITO_SECOND",
      targetDueDate: addDaysUTC(today, -cfg.secondReminderDaysAfter),
    },
  ]

  const stats: CronStats[] = []

  for (const m of milestones) {
    const s: CronStats = {
      milestone: m.key,
      candidates: 0,
      skippedAlreadySent: 0,
      skippedNoEmail: 0,
      sent: 0,
      failed: 0,
    }

    const dayStart = new Date(m.targetDueDate)
    const dayEnd = addDaysUTC(m.targetDueDate, 1)

    const candidates = await prisma.paymentSchedule.findMany({
      where: withActiveScheduleFilter({
        status: ScheduleStatus.DUE,
        dueDate: { gte: dayStart, lt: dayEnd },
      }),
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

    s.candidates = candidates.length
    if (candidates.length === 0) {
      stats.push(s)
      continue
    }

    const alreadySent = await prisma.emailLog.findMany({
      where: {
        paymentScheduleId: { in: candidates.map((c) => c.id) },
        milestoneKey: m.key,
        status: { not: EmailStatus.FAILED },
      },
      select: { paymentScheduleId: true },
    })
    const sentIds = new Set(
      alreadySent
        .map((e) => e.paymentScheduleId)
        .filter((v): v is string => v !== null),
    )

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

    const sendable: SendableItem[] = []
    const templateSlug = MILESTONE_TEMPLATE[m.key]

    for (const sched of candidates) {
      if (sentIds.has(sched.id)) {
        s.skippedAlreadySent++
        continue
      }
      const athlete = sched.courseEnrollment.athlete
      const parent = athlete.parentRelations[0]?.parent ?? null
      if (!parent || !parent.email) {
        s.skippedNoEmail++
        continue
      }

      const vars = {
        genitore_nome: `${parent.firstName} ${parent.lastName}`,
        allieva_nome: `${athlete.firstName} ${athlete.lastName}`,
        importo: (sched.amountCents / 100).toLocaleString("it-IT", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        data_scadenza: sched.dueDate.toLocaleDateString("it-IT", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
        mese: formatMeseIt(sched.dueDate),
        corso_nome: sched.courseEnrollment.course?.name ?? "",
        tipo_quota: FEE_TYPE_LABELS[sched.feeType] ?? "",
      }

      try {
        const rendered = await renderTemplate(templateSlug, vars)
        sendable.push({
          scheduleId: sched.id,
          athleteId: athlete.id,
          parentId: parent.id,
          recipientEmail: parent.email,
          recipientName: `${parent.firstName} ${parent.lastName}`,
          subject: rendered.subject,
          html: rendered.bodyHtml,
          text: rendered.bodyText,
        })
      } catch (err) {
        console.error("[cron/reminders] render failed", {
          milestone: m.key,
          scheduleId: sched.id,
          err,
        })
        s.failed++
      }
    }

    if (sendable.length === 0) {
      stats.push(s)
      continue
    }

    const batchItems: BatchItem[] = sendable.map((it) => ({
      to: it.recipientEmail,
      subject: it.subject,
      html: it.html,
      text: it.text ?? undefined,
    }))

    const batchResponse = await sendBatch(batchItems)

    const logPayload = sendable.map((item, idx) => {
      const outcome = batchResponse.results[idx]
      const ok = outcome?.success === true
      if (ok) {
        s.sent++
      } else {
        s.failed++
      }
      return {
        sentBy: sender,
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
        triggeredBy: EmailTrigger.CRON,
        milestoneKey: m.key,
      }
    })

    if (logPayload.length > 0) {
      await prisma.emailLog.createMany({ data: logPayload })
    }

    stats.push(s)
  }

  const totalSent = stats.reduce((a, s) => a + s.sent, 0)
  const totalFailed = stats.reduce((a, s) => a + s.failed, 0)

  console.log("[cron/reminders] completed", {
    totalSent,
    totalFailed,
    stats,
  })

  return NextResponse.json({
    ok: true,
    date: today.toISOString().slice(0, 10),
    totalSent,
    totalFailed,
    stats,
  })
}
