"use server"

import { revalidatePath } from "next/cache"

import {
  AuditAction,
  EmailCategory,
  EmailStatus,
  EmailTrigger,
  Prisma,
  ScheduleStatus,
} from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { REQUEST_SCOPE_CONTRIBUTION } from "@/lib/medical-certificates/request-trace"
import {
  CERT_TEMPLATE_SLUGS,
  REMINDER_TEMPLATE_CATEGORIES,
} from "@/lib/resend/template-usage"
import { requireAdmin } from "@/lib/auth/require-admin"
import { resolveCommunicationRecipient } from "@/lib/communications/recipient"
import { academicYearSlashLabel } from "@/lib/fees/association-fee"
import { renderTemplate } from "@/lib/resend/render-template"
import { sendBatch, type BatchItem } from "@/lib/resend/send-batch"
import { groupByPayer } from "@/lib/scadenze/payer-grouping"
import { reminderWhatsappText } from "@/lib/scadenze/reminder-text"
import { FEE_TYPE_LABELS } from "@/lib/schemas/payment"
import { uuidSchema } from "@/lib/schemas/common"
import { formatEuro, formatMeseIt } from "@/lib/utils/format"
import { withActiveCourseOrAssociationScheduleFilter } from "@/lib/queries/active-schedule-filter"

const DATE_IT = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
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
  phone: true,
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

// "ottobre e novembre" · "ottobre, novembre e dicembre"
function formatList(values: string[]): string {
  if (values.length <= 1) return values[0] ?? ""
  return `${values.slice(0, -1).join(", ")} e ${values[values.length - 1]}`
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
        formatEuro(s.amountCents),
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
      category: { in: REMINDER_TEMPLATE_CATEGORIES },
      // I testi dei certificati sono promemoria anche loro, ma parlano
      // d'altro: per un contributo non si propongono
      slug: { notIn: CERT_TEMPLATE_SLUGS },
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
  // Serve a comporre il link di WhatsApp: il messaggio lo manda Giuseppina
  recipientPhone: string | null
  recipientName: string
  athleteName: string
  subject: string
  bodyHtml: string
  bodyText: string | null
  // Lo stesso testo del modello, in chiaro, da mandare su WhatsApp
  whatsappText: string
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
    importo: formatEuro(schedule.amountCents),
    data_scadenza: schedule.dueDate.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
    mese: reminderPeriod(schedule),
    corso_nome: schedule.courseEnrollment?.course.name ?? "",
    tipo_quota: FEE_TYPE_LABELS[schedule.feeType] ?? "",
    // Anche con una rata sola: l'anteprima deve mostrare quello che il
    // destinatario leggerà, e l'invio riempie sempre questa variabile
    elenco_rate: `${athleteName} — ${reminderPeriod(schedule)}: ${formatEuro(schedule.amountCents)}`,
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
    recipientEmail: parent?.email ?? athlete.email ?? null,
    recipientPhone: parent?.phone ?? athlete.phone ?? null,
    recipientName,
    athleteName,
    subject: rendered.subject,
    bodyHtml: rendered.bodyHtml,
    bodyText: rendered.bodyText,
    whatsappText: reminderWhatsappText(rendered),
    warning,
  }
}

/**
 * Sollecito aperto su WhatsApp.
 *
 * Non invia niente: registra che la chat è stata aperta dal gestionale con il
 * messaggio già scritto. Che poi il messaggio sia partito non lo sappiamo —
 * wa.me apre WhatsApp e lì il gestionale non vede più niente — ed è lo stesso
 * motivo per cui la ricevuta condivisa si traccia così (RECEIPT_SHARED).
 */
export async function recordWhatsappReminder(
  scheduleId: string,
): Promise<{ ok: boolean }> {
  const { userId } = await requireAdmin()

  const idParsed = uuidSchema.safeParse(scheduleId)
  if (!idParsed.success) return { ok: false }

  const schedule = await prisma.paymentSchedule.findFirst({
    where: withActiveCourseOrAssociationScheduleFilter({ id: idParsed.data }),
    include: SCHEDULE_INCLUDE,
  })
  if (!schedule) return { ok: false }

  const athlete = schedule.courseEnrollment?.athlete ?? schedule.athlete
  const parent = athlete?.parentRelations[0]?.parent ?? null

  await prisma.auditLog.create({
    data: {
      userId,
      action: AuditAction.REMINDER_WHATSAPP_OPENED,
      entityType: "PaymentSchedule",
      entityId: idParsed.data,
      changes: {
        // La stessa azione traccia anche le richieste del certificato: le
        // distingue l'ambito (le righe vecchie, senza, sono contributi)
        ambito: REQUEST_SCOPE_CONTRIBUTION,
        athleteId: athlete?.id ?? null,
        // Il nome di chi si è scelto di contattare, non il numero: a cosa è
        // servito si capisce, i dati di contatto restano in anagrafica
        destinatario: parent
          ? `${parent.firstName} ${parent.lastName}`
          : athlete
            ? `${athlete.firstName} ${athlete.lastName}`
            : null,
        periodo: reminderPeriod(schedule),
      },
    },
  })

  revalidatePath("/admin/scadenze")
  return { ok: true }
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

  // Un messaggio per famiglia: le rate si raggruppano per destinatario, e
  // l'email elenca i mesi. Prima partiva un'email per rata, e una famiglia
  // con due figlie e due mesi ne riceveva quattro in mezzo secondo.
  type Resolved = {
    scheduleId: string
    athleteId: string
    athleteName: string
    parentId: string | null
    recipientEmail: string
    recipientName: string
    periodo: string
    amountCents: number
    dueDate: Date
    courseName: string
    feeTypeLabel: string
  }

  type SendableGroup = {
    items: Resolved[]
    recipientEmail: string
    recipientName: string
    parentId: string | null
    subject: string
    html: string
    text: string | null
  }

  const results: SendReminderResult[] = []
  const resolvedItems: Resolved[] = []

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

    resolvedItems.push({
      scheduleId: s.id,
      athleteId: athlete.id,
      athleteName: `${athlete.firstName} ${athlete.lastName}`,
      parentId: resolved.recipient.parentId,
      recipientEmail: resolved.recipient.email,
      recipientName: resolved.recipient.name,
      periodo: reminderPeriod(s),
      amountCents: s.amountCents,
      dueDate: s.dueDate,
      courseName: s.courseEnrollment?.course.name ?? "",
      feeTypeLabel: FEE_TYPE_LABELS[s.feeType] ?? "",
    })
  }

  const sendable: SendableGroup[] = []

  for (const group of groupByPayer(resolvedItems)) {
    const items = group.items
    const first = items[0]
    const totalCents = items.reduce((sum, i) => sum + i.amountCents, 0)
    // La più vicina: è quella che rende urgente il messaggio
    const earliest = items.reduce((min, i) =>
      i.dueDate.getTime() < min.dueDate.getTime() ? i : min,
    )
    const periodi = [...new Set(items.map((i) => i.periodo))]
    const allieve = [...new Set(items.map((i) => i.athleteName))]

    const vars = {
      genitore_nome: first.recipientName,
      allieva_nome: formatList(allieve),
      // Con una rata sola è esattamente quello che usciva prima
      importo: formatEuro(totalCents),
      data_scadenza: DATE_IT.format(earliest.dueDate),
      mese: formatList(periodi),
      corso_nome: first.courseName,
      tipo_quota: first.feeTypeLabel,
      // Variabile nuova: i modelli che non la usano restano come sono
      elenco_rate: items
        .map(
          (i) =>
            `${i.athleteName} — ${i.periodo}: ${formatEuro(i.amountCents)}`,
        )
        .join("; "),
    }

    try {
      const rendered = await renderTemplate(templateSlug, vars)
      sendable.push({
        items,
        recipientEmail: first.recipientEmail,
        recipientName: first.recipientName,
        parentId: group.parentId,
        subject: rendered.subject,
        html: rendered.bodyHtml,
        text: rendered.bodyText,
      })
    } catch (err) {
      for (const item of items) {
        results.push({
          scheduleId: item.scheduleId,
          recipientEmail: item.recipientEmail,
          recipientName: item.recipientName,
          status: "FAILED",
          error:
            err instanceof Error ? err.message : "Errore rendering template",
        })
      }
    }
  }

  let transportError: string | undefined
  if (sendable.length > 0) {
    const batchItems: BatchItem[] = sendable.map((group) => ({
      to: group.recipientEmail,
      subject: group.subject,
      html: group.html,
      text: group.text ?? undefined,
    }))

    const batchResponse = await sendBatch(batchItems)
    transportError = batchResponse.transportError

    // Una riga di log per rata, anche quando l'email è una sola: così la
    // storia dei solleciti resta giusta su ogni scadenza. Le righe della
    // stessa email condividono il providerId.
    const logPayload = sendable.flatMap((group, idx) => {
      const outcome = batchResponse.results[idx]
      const ok = outcome?.success === true

      return group.items.map((item) => {
        results.push({
          scheduleId: item.scheduleId,
          recipientEmail: group.recipientEmail,
          recipientName: group.recipientName,
          status: ok ? "SENT" : "FAILED",
          providerId: ok ? outcome.providerId : undefined,
          error: ok ? undefined : outcome?.error ?? "Errore invio",
        })

        return {
          sentBy: admin.userId,
          recipientEmail: group.recipientEmail,
          recipientName: group.recipientName,
          templateSlug,
          subject: group.subject,
          bodyHtml: group.html,
          bodyText: group.text,
          athleteId: item.athleteId,
          parentId: group.parentId,
          paymentScheduleId: item.scheduleId,
          status: ok ? EmailStatus.SENT : EmailStatus.FAILED,
          providerId: ok ? outcome.providerId : null,
          errorMessage: ok ? null : outcome?.error ?? "Errore invio",
          triggeredBy: EmailTrigger.ADMIN_MANUAL,
          milestoneKey: null,
        }
      })
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
