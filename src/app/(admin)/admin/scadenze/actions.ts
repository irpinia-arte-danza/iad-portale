"use server"

import { revalidatePath } from "next/cache"

import {
  EmailCategory,
  EmailStatus,
  EmailTrigger,
  Prisma,
  ScheduleStatus,
} from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"
import { resolveCommunicationRecipient } from "@/lib/communications/recipient"
import { academicYearSlashLabel } from "@/lib/fees/association-fee"
import { renderTemplate } from "@/lib/resend/render-template"
import { sendBatch, type BatchItem } from "@/lib/resend/send-batch"
import { FEE_TYPE_LABELS } from "@/lib/schemas/payment"
import { formatMeseIt } from "@/lib/utils/format"
import { withActiveCourseOrAssociationScheduleFilter } from "@/lib/queries/active-schedule-filter"

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

// Allieva e genitore di riferimento: dall'iscrizione al corso per le mensili,
// direttamente dall'allieva per la quota associativa.
const SCHEDULE_ATHLETE_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  // Destinataria quando non ha genitori collegati (corso adulti)
  email: true,
  // Serve al limite dei 18 anni per il ripiego sull allieva
  dateOfBirth: true,
  parentRelations: {
    where: { parent: { deletedAt: null } },
    orderBy: [{ isPrimaryPayer: "desc" }, { isPrimaryContact: "desc" }],
    take: 1,
    select: {
      parent: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
    },
  },
} satisfies Prisma.AthleteSelect

const SCHEDULE_INCLUDE = {
  courseEnrollment: {
    select: {
      course: { select: { name: true } },
      athlete: { select: SCHEDULE_ATHLETE_SELECT },
    },
  },
  athlete: { select: SCHEDULE_ATHLETE_SELECT },
  academicYear: { select: { label: true } },
} satisfies Prisma.PaymentScheduleInclude

// Variabile {mese} dei template ("la quota di {mese} per {allieva_nome}"):
// il mese della scadenza per le mensili, "associativa 2026/2027" per la quota
// associativa, così il testo resta corretto senza toccare i template.
function reminderPeriod(schedule: {
  feeType: string
  dueDate: Date
  academicYear: { label: string }
}): string {
  if (schedule.feeType === "ASSOCIATION") {
    return `associativa ${academicYearSlashLabel(schedule.academicYear.label)}`
  }
  return formatMeseIt(schedule.dueDate)
}

export async function getScadenzeCSVData(
  scheduleIds: string[],
): Promise<{ headers: string[]; rows: string[][] }> {
  await requireAdmin()

  if (scheduleIds.length === 0) {
    return { headers: [], rows: [] }
  }

  const schedules = await prisma.paymentSchedule.findMany({
    where: withActiveCourseOrAssociationScheduleFilter({
      id: { in: scheduleIds },
      status: ScheduleStatus.DUE,
    }),
    orderBy: { dueDate: "asc" },
    include: SCHEDULE_INCLUDE,
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
    "Contatto",
    "Email",
    "Telefono",
    "Corso / causale",
    "Importo",
    "Scadenza",
    "Giorni ritardo",
    "Ultimo sollecito",
    "Email inviate",
  ]

  const rows = schedules.flatMap((s) => {
    const athlete = s.courseEnrollment?.athlete ?? s.athlete
    if (!athlete) return []

    const parent = athlete.parentRelations[0]?.parent ?? null
    // Chi riceverebbe il sollecito: il genitore, o l'allieva se non ne ha
    const contact = resolveCommunicationRecipient(athlete)
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
      [
        `${athlete.lastName} ${athlete.firstName}`,
        contact.ok ? contact.recipient.name : "—",
        contact.ok ? contact.recipient.email : "",
        parent?.phone ?? "",
        s.courseEnrollment?.course.name ?? s.notes ?? "—",
        CURRENCY_IT.format(s.amountCents / 100),
        DATE_IT.format(s.dueDate),
        String(giorniRitardo),
        email?.lastSent ? DATE_IT.format(email.lastSent) : "",
        String(email?.count ?? 0),
      ],
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

  const schedule = await prisma.paymentSchedule.findFirst({
    where: withActiveCourseOrAssociationScheduleFilter({
      id: scheduleId,
    }),
    include: SCHEDULE_INCLUDE,
  })

  if (!schedule) {
    throw new Error("Scadenza non trovata")
  }
  const athlete = schedule.courseEnrollment?.athlete ?? schedule.athlete
  if (!athlete) {
    throw new Error("Scadenza non collegata a un'allieva")
  }

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
    mese: reminderPeriod(schedule),
    corso_nome: schedule.courseEnrollment?.course.name ?? "",
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
    where: withActiveCourseOrAssociationScheduleFilter({
      id: { in: scheduleIds },
      status: ScheduleStatus.DUE,
    }),
    orderBy: { dueDate: "asc" },
    include: SCHEDULE_INCLUDE,
  })

  type SendableItem = {
    scheduleId: string
    athleteId: string
    // null quando il sollecito va all'allieva stessa
    parentId: string | null
    recipientEmail: string
    recipientName: string
    subject: string
    html: string
    text: string | null
  }

  const results: SendReminderResult[] = []
  const sendable: SendableItem[] = []

  for (const s of schedules) {
    const athlete = s.courseEnrollment?.athlete ?? s.athlete
    if (!athlete) continue // stage, saggio, costumi: fuori dai solleciti
    // Il genitore collegato, oppure l'allieva stessa se non ne ha. I solleciti
    // di pagamento non guardano l'interruttore delle comunicazioni: resta
    // com'era.
    const resolved = resolveCommunicationRecipient(athlete)

    if (!resolved.ok) {
      results.push({
        scheduleId: s.id,
        recipientEmail: "",
        recipientName: `${athlete.firstName} ${athlete.lastName}`,
        status: "SKIPPED",
        error: resolved.message,
      })
      continue
    }

    const recipient = resolved.recipient

    const vars = {
      genitore_nome: recipient.name,
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
      mese: reminderPeriod(s),
      corso_nome: s.courseEnrollment?.course.name ?? "",
      tipo_quota: FEE_TYPE_LABELS[s.feeType] ?? "",
    }

    try {
      const rendered = await renderTemplate(templateSlug, vars)
      sendable.push({
        scheduleId: s.id,
        athleteId: athlete.id,
        parentId: recipient.parentId,
        recipientEmail: recipient.email,
        recipientName: recipient.name,
        subject: rendered.subject,
        html: rendered.bodyHtml,
        text: rendered.bodyText,
      })
    } catch (err) {
      results.push({
        scheduleId: s.id,
        recipientEmail: recipient.email,
        recipientName: recipient.name,
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
