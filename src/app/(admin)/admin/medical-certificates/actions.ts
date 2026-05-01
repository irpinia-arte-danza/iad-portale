"use server"

import { revalidatePath } from "next/cache"

import {
  AuditAction,
  EmailStatus,
  EmailTrigger,
} from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"
import { renderTemplate } from "@/lib/resend/render-template"
import { sendBatch, type BatchItem } from "@/lib/resend/send-batch"
import {
  classifyCert,
  MEDICAL_CERT_TYPE_LABELS,
  normalizeCertType,
} from "@/lib/schemas/medical-certificate"
import { uuidSchema } from "@/lib/schemas/common"

const TEMPLATE_SLUG = "cert-reminder"
const RATE_LIMIT_PER_DAY = 3

const DATE_IT = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

export type CertReminderResult = {
  athleteId: string
  athleteName: string
  recipientEmail: string
  status: "SENT" | "FAILED" | "SKIPPED"
  reason?: string
  providerId?: string
}

export type CertReminderBatchResponse = {
  results: CertReminderResult[]
  summary: { sent: number; failed: number; skipped: number }
  transportError?: string
}

type SendableTarget = {
  athleteId: string
  athleteName: string
  parentId: string
  parentName: string
  recipientEmail: string
  certType: string
  expiryDate: Date
  daysToExpiry: number
}

async function loadTargets(athleteIds: string[]) {
  return prisma.athlete.findMany({
    where: { id: { in: athleteIds }, deletedAt: null },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      medicalCertificates: {
        where: { deletedAt: null },
        orderBy: { issueDate: "desc" },
        take: 1,
        select: {
          id: true,
          type: true,
          expiryDate: true,
        },
      },
      parentRelations: {
        where: { parent: { deletedAt: null } },
        orderBy: [
          { isPrimaryContact: "desc" },
          { isPrimaryPayer: "desc" },
        ],
        take: 1,
        select: {
          parent: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              receivesEmailCommunications: true,
            },
          },
        },
      },
    },
  })
}

async function recentReminderCounts(
  athleteIds: string[],
): Promise<Map<string, number>> {
  if (athleteIds.length === 0) return new Map()
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const rows = await prisma.emailLog.groupBy({
    by: ["athleteId"],
    where: {
      athleteId: { in: athleteIds },
      templateSlug: TEMPLATE_SLUG,
      sentAt: { gte: since },
    },
    _count: { _all: true },
  })
  const m = new Map<string, number>()
  for (const r of rows) {
    if (r.athleteId) m.set(r.athleteId, r._count._all)
  }
  return m
}

export async function sendCertReminders(
  rawAthleteIds: string[],
): Promise<CertReminderBatchResponse> {
  const admin = await requireAdmin()

  const athleteIds = Array.from(
    new Set(
      rawAthleteIds
        .map((id) => uuidSchema.safeParse(id))
        .filter((p) => p.success)
        .map((p) => p.data),
    ),
  )

  if (athleteIds.length === 0) {
    return { results: [], summary: { sent: 0, failed: 0, skipped: 0 } }
  }

  const [targets, recentCounts] = await Promise.all([
    loadTargets(athleteIds),
    recentReminderCounts(athleteIds),
  ])

  const targetById = new Map(targets.map((t) => [t.id, t]))
  const results: CertReminderResult[] = []
  const sendable: SendableTarget[] = []

  for (const athleteId of athleteIds) {
    const t = targetById.get(athleteId)
    if (!t) {
      results.push({
        athleteId,
        athleteName: "—",
        recipientEmail: "",
        status: "SKIPPED",
        reason: "Allieva non trovata",
      })
      continue
    }

    const athleteName = `${t.lastName} ${t.firstName}`
    const cert = t.medicalCertificates[0] ?? null
    const parent = t.parentRelations[0]?.parent ?? null

    if (!cert) {
      results.push({
        athleteId,
        athleteName,
        recipientEmail: parent?.email ?? "",
        status: "SKIPPED",
        reason:
          "Nessun certificato registrato — il promemoria si applica solo a certificati esistenti",
      })
      continue
    }

    const status = classifyCert(cert.expiryDate)
    if (status === "valid") {
      results.push({
        athleteId,
        athleteName,
        recipientEmail: parent?.email ?? "",
        status: "SKIPPED",
        reason: "Certificato ancora valido (>30 giorni alla scadenza)",
      })
      continue
    }

    if (!parent || !parent.email) {
      results.push({
        athleteId,
        athleteName,
        recipientEmail: parent?.email ?? "",
        status: "SKIPPED",
        reason: parent
          ? "Genitore senza email"
          : "Nessun genitore collegato",
      })
      continue
    }

    if (!parent.receivesEmailCommunications) {
      results.push({
        athleteId,
        athleteName,
        recipientEmail: parent.email,
        status: "SKIPPED",
        reason: "Genitore ha disattivato le comunicazioni email",
      })
      continue
    }

    const sentToday = recentCounts.get(athleteId) ?? 0
    if (sentToday >= RATE_LIMIT_PER_DAY) {
      results.push({
        athleteId,
        athleteName,
        recipientEmail: parent.email,
        status: "SKIPPED",
        reason: `Già inviati ${sentToday} promemoria nelle ultime 24h (limite ${RATE_LIMIT_PER_DAY})`,
      })
      continue
    }

    const days = Math.floor(
      (new Date(cert.expiryDate).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24),
    )
    sendable.push({
      athleteId,
      athleteName,
      parentId: parent.id,
      parentName: `${parent.firstName} ${parent.lastName}`,
      recipientEmail: parent.email,
      certType:
        MEDICAL_CERT_TYPE_LABELS[normalizeCertType(cert.type)] ?? cert.type,
      expiryDate: cert.expiryDate,
      daysToExpiry: days,
    })
  }

  let transportError: string | undefined

  if (sendable.length === 0) {
    return {
      results,
      summary: results.reduce(
        (acc, r) => {
          if (r.status === "SENT") acc.sent += 1
          else if (r.status === "FAILED") acc.failed += 1
          else acc.skipped += 1
          return acc
        },
        { sent: 0, failed: 0, skipped: 0 },
      ),
    }
  }

  type Prepared = {
    target: SendableTarget
    subject: string
    html: string
    text: string | null
  }

  const prepared: Prepared[] = []
  for (const t of sendable) {
    try {
      const rendered = await renderTemplate(TEMPLATE_SLUG, {
        genitore_nome: t.parentName,
        allieva_nome: t.athleteName,
        data_scadenza: DATE_IT.format(t.expiryDate),
        giorni_scadenza: t.daysToExpiry,
        tipo_certificato: t.certType,
      })
      prepared.push({
        target: t,
        subject: rendered.subject,
        html: rendered.bodyHtml,
        text: rendered.bodyText,
      })
    } catch (err) {
      results.push({
        athleteId: t.athleteId,
        athleteName: t.athleteName,
        recipientEmail: t.recipientEmail,
        status: "FAILED",
        reason:
          err instanceof Error ? err.message : "Errore rendering template",
      })
    }
  }

  if (prepared.length > 0) {
    const items: BatchItem[] = prepared.map((p) => ({
      to: p.target.recipientEmail,
      subject: p.subject,
      html: p.html,
      text: p.text ?? undefined,
    }))

    const batch = await sendBatch(items)
    transportError = batch.transportError

    const logPayload = prepared.map((p, idx) => {
      const outcome = batch.results[idx]
      const ok = outcome?.success === true

      results.push({
        athleteId: p.target.athleteId,
        athleteName: p.target.athleteName,
        recipientEmail: p.target.recipientEmail,
        status: ok ? "SENT" : "FAILED",
        providerId: ok ? outcome.providerId : undefined,
        reason: ok ? undefined : outcome?.error ?? "Errore invio",
      })

      return {
        sentBy: admin.userId,
        recipientEmail: p.target.recipientEmail,
        recipientName: p.target.parentName,
        templateSlug: TEMPLATE_SLUG,
        subject: p.subject,
        bodyHtml: p.html,
        bodyText: p.text,
        athleteId: p.target.athleteId,
        parentId: p.target.parentId,
        paymentScheduleId: null,
        status: ok ? EmailStatus.SENT : EmailStatus.FAILED,
        providerId: ok ? outcome.providerId : null,
        errorMessage: ok ? null : outcome?.error ?? "Errore invio",
        triggeredBy: EmailTrigger.ADMIN_MANUAL,
        milestoneKey: null,
      }
    })

    if (logPayload.length > 0) {
      await prisma.emailLog.createMany({ data: logPayload })
      const sentEntries = logPayload.filter(
        (l) => l.status === EmailStatus.SENT,
      )
      if (sentEntries.length > 0) {
        await prisma.auditLog.createMany({
          data: sentEntries.map((l) => ({
            userId: admin.userId,
            action: AuditAction.MEDICAL_CERT_EMAIL_SENT,
            entityType: "Athlete",
            entityId: l.athleteId ?? null,
            changes: {
              recipientEmail: l.recipientEmail,
              templateSlug: TEMPLATE_SLUG,
            },
          })),
        })
      }
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

  revalidatePath("/admin/medical-certificates")
  revalidatePath("/admin/dashboard")

  return { results, summary, transportError }
}
