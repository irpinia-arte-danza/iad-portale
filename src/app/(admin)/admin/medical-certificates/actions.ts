"use server"

import { revalidatePath } from "next/cache"

import { AuditAction, EmailStatus, EmailTrigger } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"
import { resolveCommunicationRecipient } from "@/lib/communications/recipient"
import {
  classifyCert,
  CURRENT_CERTIFICATE_ORDER,
  daysUntilExpiry,
  type CertStatus,
} from "@/lib/medical-certificates/certificate-status"
import {
  certRequestTemplate,
  joinNames,
  planCertRequests,
} from "@/lib/medical-certificates/request-plan"
import { REQUEST_SCOPE_CERTIFICATE } from "@/lib/medical-certificates/request-trace"
import { renderTemplate } from "@/lib/resend/render-template"
import { sendBatch, type BatchItem } from "@/lib/resend/send-batch"
import { reminderWhatsappText } from "@/lib/scadenze/reminder-text"
import { uuidSchema } from "@/lib/schemas/common"
import {
  MEDICAL_CERT_TYPE_LABELS,
  normalizeCertType,
} from "@/lib/schemas/medical-certificate"
import { isMinorAt } from "@/lib/utils/age"
import { todayDateOnly } from "@/lib/utils/date-only"
import { fullName } from "@/lib/utils/person-name"

// ─────────────────────────────────────────────────────────────────────────
// "Chiedi al genitore": la richiesta del certificato alla famiglia.
//
// Per ogni stato c'è un testo (vedi request-plan): il mancante ha il suo,
// scaduto e in scadenza usano il promemoria con tipo e data. Due canali come
// nei solleciti dei contributi: l'email parte da qui, WhatsApp si apre col
// messaggio già scritto e l'invio lo fa Giuseppina. Niente parte senza
// l'anteprima e la conferma.
// ─────────────────────────────────────────────────────────────────────────

const RATE_LIMIT_PER_DAY = 3
const LIST_PATH = "/admin/medical-certificates"

const DATE_IT = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

const TARGET_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  // Destinataria quando non ha genitori collegati (corso adulti)
  email: true,
  phone: true,
  // Serve al limite dei 18 anni per il ripiego sull'allieva
  dateOfBirth: true,
  medicalCertificates: {
    where: { deletedAt: null },
    orderBy: CURRENT_CERTIFICATE_ORDER,
    take: 1,
    select: { id: true, type: true, expiryDate: true },
  },
  parentRelations: {
    where: { parent: { deletedAt: null } },
    orderBy: [
      { isPrimaryContact: "desc" as const },
      { isPrimaryPayer: "desc" as const },
    ],
    take: 1,
    select: {
      parent: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          receivesEmailCommunications: true,
        },
      },
    },
  },
}

async function loadTargets(athleteIds: string[]) {
  return prisma.athlete.findMany({
    // Le ritirate non devono fare lezione: non si chiede niente
    where: {
      id: { in: athleteIds },
      deletedAt: null,
      status: { not: "WITHDRAWN" },
    },
    select: TARGET_SELECT,
  })
}

type Target = Awaited<ReturnType<typeof loadTargets>>[number]

function certVars(target: Target, athleteNames: string, recipientName: string) {
  const cert = target.medicalCertificates[0] ?? null
  return {
    genitore_nome: recipientName,
    allieva_nome: athleteNames,
    // Solo per il promemoria: il testo del mancante non le usa
    data_scadenza: cert ? DATE_IT.format(cert.expiryDate) : "",
    giorni_scadenza: cert ? daysUntilExpiry(cert.expiryDate) : "",
    tipo_certificato: cert
      ? (MEDICAL_CERT_TYPE_LABELS[normalizeCertType(cert.type)] ?? cert.type)
      : "",
  }
}

function statusOf(target: Target): CertStatus {
  return classifyCert(
    target.medicalCertificates[0]?.expiryDate ?? null,
    todayDateOnly(),
  )
}

// Chi si contatta, anche quando l'email non c'è: per WhatsApp basta il
// telefono
function contactOf(target: Target): {
  name: string
  email: string | null
  phone: string | null
  parentId: string | null
} | null {
  const parent = target.parentRelations[0]?.parent ?? null
  if (parent) {
    return {
      name: fullName(parent),
      email: parent.email,
      phone: parent.phone,
      parentId: parent.id,
    }
  }
  if (isMinorAt(target.dateOfBirth, todayDateOnly())) return null
  return {
    name: fullName(target),
    email: target.email,
    phone: target.phone,
    parentId: null,
  }
}

export type CertRequestPreview = {
  athleteId: string
  recipientName: string
  recipientEmail: string | null
  recipientPhone: string | null
  athleteName: string
  // Quale testo si usa: dipende dallo stato del certificato
  templateSlug: string
  subject: string
  bodyHtml: string
  // Lo stesso testo, in chiaro, per WhatsApp
  whatsappText: string
  // Perché l'email non può partire, se non può
  warning?: string
}

export type CertRequestPreviewResult =
  | { ok: true; preview: CertRequestPreview }
  | { ok: false; error: string }

/**
 * Anteprima della richiesta per una allieva. Non invia e non scrive niente.
 *
 * `withAthleteIds`: nell'invio di gruppo le sorelle senza certificato stanno
 * nella stessa email. L'anteprima deve mostrare quello che la famiglia
 * leggerà, quindi i loro nomi vanno insieme.
 */
export async function previewCertRequest(
  athleteId: string,
  withAthleteIds: string[] = [],
): Promise<CertRequestPreviewResult> {
  await requireAdmin()

  const idParsed = uuidSchema.safeParse(athleteId)
  if (!idParsed.success) return { ok: false, error: "Allieva non valida" }

  const [target] = await loadTargets([idParsed.data])
  if (!target) return { ok: false, error: "Allieva non trovata" }

  const templateSlug = certRequestTemplate(statusOf(target))
  if (!templateSlug) {
    return {
      ok: false,
      error: "Il certificato è valido: non c'è niente da chiedere.",
    }
  }

  const contact = contactOf(target)
  if (!contact) {
    return {
      ok: false,
      error:
        "È minorenne e non ha un genitore collegato: collega un genitore per poterlo chiedere.",
    }
  }

  // Le altre allieve della stessa email: solo quelle che esistono davvero
  const siblingIds = withAthleteIds
    .map((id) => uuidSchema.safeParse(id))
    .filter((parsed) => parsed.success)
    .map((parsed) => parsed.data)
    .filter((id) => id !== target.id)
  const siblings = siblingIds.length > 0 ? await loadTargets(siblingIds) : []
  const athleteNames = joinNames([
    fullName(target),
    ...siblingIds.flatMap((id) => {
      const sibling = siblings.find((s) => s.id === id)
      return sibling ? [fullName(sibling)] : []
    }),
  ])

  let rendered
  try {
    rendered = await renderTemplate(
      templateSlug,
      certVars(target, athleteNames, contact.name),
    )
  } catch {
    return {
      ok: false,
      error:
        "Il testo di questa richiesta manca o è disattivato: controllalo in Testi delle email.",
    }
  }

  const resolved = resolveCommunicationRecipient(target, {
    requireCommunicationsConsent: true,
  })

  return {
    ok: true,
    preview: {
      athleteId: target.id,
      recipientName: contact.name,
      recipientEmail: contact.email,
      recipientPhone: contact.phone,
      athleteName: athleteNames,
      templateSlug,
      subject: rendered.subject,
      bodyHtml: rendered.bodyHtml,
      whatsappText: reminderWhatsappText(rendered),
      warning: resolved.ok ? undefined : resolved.message,
    },
  }
}

/**
 * Traccia della richiesta su WhatsApp. Non invia niente: registra che la
 * chat è stata aperta dal gestionale col messaggio già scritto. Stessa
 * azione dei solleciti dei contributi; la distingue `ambito`.
 */
export async function recordCertWhatsappRequest(
  athleteId: string,
): Promise<{ ok: boolean }> {
  const { userId } = await requireAdmin()

  const idParsed = uuidSchema.safeParse(athleteId)
  if (!idParsed.success) return { ok: false }

  const [target] = await loadTargets([idParsed.data])
  if (!target) return { ok: false }
  const contact = contactOf(target)

  await prisma.auditLog.create({
    data: {
      userId,
      action: AuditAction.REMINDER_WHATSAPP_OPENED,
      entityType: "Athlete",
      entityId: target.id,
      changes: {
        ambito: REQUEST_SCOPE_CERTIFICATE,
        // Il nome di chi si è contattato, non il numero
        destinatario: contact?.name ?? null,
        stato: statusOf(target),
      },
    },
  })

  revalidatePath(LIST_PATH)
  revalidatePath(`/admin/athletes/${target.id}`)
  return { ok: true }
}

export type CertRequestResult = {
  athleteIds: string[]
  athleteName: string
  recipientEmail: string
  status: "SENT" | "FAILED" | "SKIPPED"
  reason?: string
}

export type CertRequestBatchResponse = {
  results: CertRequestResult[]
  summary: { sent: number; failed: number; skipped: number }
  transportError?: string
}

function summarize(results: CertRequestResult[]) {
  return results.reduce(
    (acc, r) => {
      if (r.status === "SENT") acc.sent += 1
      else if (r.status === "FAILED") acc.failed += 1
      else acc.skipped += 1
      return acc
    },
    { sent: 0, failed: 0, skipped: 0 },
  )
}

async function recentRequestCounts(
  athleteIds: string[],
): Promise<Map<string, number>> {
  if (athleteIds.length === 0) return new Map()
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  // Dall'audit e non da EmailLog: una email può riguardare due sorelle, e
  // il limite è per allieva
  const rows = await prisma.auditLog.groupBy({
    by: ["entityId"],
    where: {
      action: AuditAction.MEDICAL_CERT_EMAIL_SENT,
      entityType: "Athlete",
      entityId: { in: athleteIds },
      createdAt: { gte: since },
    },
    _count: { _all: true },
  })
  const counts = new Map<string, number>()
  for (const row of rows) {
    if (row.entityId) counts.set(row.entityId, row._count._all)
  }
  return counts
}

/**
 * Invio per email, anche di gruppo: una email per famiglia per i certificati
 * mancanti, una per allieva per scaduti e in scadenza (planCertRequests).
 */
export async function sendCertRequests(
  rawAthleteIds: string[],
): Promise<CertRequestBatchResponse> {
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
    recentRequestCounts(athleteIds),
  ])
  const targetById = new Map(targets.map((t) => [t.id, t]))
  const results: CertRequestResult[] = []

  // Chi può ricevere, con il destinatario già risolto
  type Ready = {
    target: Target
    recipient: { email: string; name: string; parentId: string | null }
  }
  const ready = new Map<string, Ready>()

  for (const athleteId of athleteIds) {
    const target = targetById.get(athleteId)
    if (!target) {
      results.push({
        athleteIds: [athleteId],
        athleteName: "—",
        recipientEmail: "",
        status: "SKIPPED",
        reason: "Allieva non trovata",
      })
      continue
    }
    const athleteName = fullName(target)

    if (!certRequestTemplate(statusOf(target))) {
      results.push({
        athleteIds: [athleteId],
        athleteName,
        recipientEmail: "",
        status: "SKIPPED",
        reason: "Certificato valido: niente da chiedere",
      })
      continue
    }

    const resolved = resolveCommunicationRecipient(target, {
      requireCommunicationsConsent: true,
    })
    if (!resolved.ok) {
      results.push({
        athleteIds: [athleteId],
        athleteName,
        recipientEmail: "",
        status: "SKIPPED",
        reason: resolved.message,
      })
      continue
    }

    const sentToday = recentCounts.get(athleteId) ?? 0
    if (sentToday >= RATE_LIMIT_PER_DAY) {
      results.push({
        athleteIds: [athleteId],
        athleteName,
        recipientEmail: resolved.recipient.email,
        status: "SKIPPED",
        reason: `Già chiesto ${sentToday} volte nelle ultime 24 ore (limite ${RATE_LIMIT_PER_DAY})`,
      })
      continue
    }

    ready.set(athleteId, { target, recipient: resolved.recipient })
  }

  const plan = planCertRequests(
    [...ready.values()].map(({ target, recipient }) => ({
      athleteId: target.id,
      athleteName: fullName(target),
      status: statusOf(target),
      recipientKey: recipient.parentId
        ? `parent:${recipient.parentId}`
        : `athlete:${target.id}`,
    })),
  )

  type Prepared = {
    athleteIds: string[]
    athleteName: string
    recipient: Ready["recipient"]
    templateSlug: string
    subject: string
    html: string
    text: string | null
  }
  const prepared: Prepared[] = []

  for (const email of plan.emails) {
    const first = ready.get(email.athleteIds[0])
    if (!first) continue
    const athleteName = joinNames(email.athleteNames)
    try {
      const rendered = await renderTemplate(
        email.templateSlug,
        certVars(first.target, athleteName, first.recipient.name),
      )
      prepared.push({
        athleteIds: email.athleteIds,
        athleteName,
        recipient: first.recipient,
        templateSlug: email.templateSlug,
        subject: rendered.subject,
        html: rendered.bodyHtml,
        text: rendered.bodyText,
      })
    } catch (err) {
      results.push({
        athleteIds: email.athleteIds,
        athleteName,
        recipientEmail: first.recipient.email,
        status: "FAILED",
        reason:
          err instanceof Error ? err.message : "Errore nel testo dell'email",
      })
    }
  }

  let transportError: string | undefined

  if (prepared.length > 0) {
    const items: BatchItem[] = prepared.map((p) => ({
      to: p.recipient.email,
      subject: p.subject,
      html: p.html,
      text: p.text ?? undefined,
    }))
    const batch = await sendBatch(items)
    transportError = batch.transportError

    const logs = prepared.map((p, idx) => {
      const outcome = batch.results[idx]
      const ok = outcome?.success === true
      results.push({
        athleteIds: p.athleteIds,
        athleteName: p.athleteName,
        recipientEmail: p.recipient.email,
        status: ok ? "SENT" : "FAILED",
        reason: ok ? undefined : (outcome?.error ?? "Errore invio"),
      })
      return {
        prepared: p,
        ok,
        row: {
          sentBy: admin.userId,
          recipientEmail: p.recipient.email,
          recipientName: p.recipient.name,
          templateSlug: p.templateSlug,
          subject: p.subject,
          bodyHtml: p.html,
          bodyText: p.text,
          // Una riga per email: l'allieva è la prima del gruppo, le altre
          // stanno nell'audit qui sotto
          athleteId: p.athleteIds[0],
          parentId: p.recipient.parentId,
          paymentScheduleId: null,
          status: ok ? EmailStatus.SENT : EmailStatus.FAILED,
          providerId: ok ? outcome.providerId : null,
          errorMessage: ok ? null : (outcome?.error ?? "Errore invio"),
          triggeredBy: EmailTrigger.ADMIN_MANUAL,
          milestoneKey: null,
        },
      }
    })

    await prisma.emailLog.createMany({ data: logs.map((l) => l.row) })

    // Una riga di audit per allieva: è da qui che si legge "Ultima richiesta"
    const audit = logs
      .filter((l) => l.ok)
      .flatMap((l) =>
        l.prepared.athleteIds.map((athleteId) => ({
          userId: admin.userId,
          action: AuditAction.MEDICAL_CERT_EMAIL_SENT,
          entityType: "Athlete",
          entityId: athleteId,
          changes: {
            ambito: REQUEST_SCOPE_CERTIFICATE,
            recipientEmail: l.prepared.recipient.email,
            templateSlug: l.prepared.templateSlug,
          },
        })),
      )
    if (audit.length > 0) await prisma.auditLog.createMany({ data: audit })
  }

  revalidatePath(LIST_PATH)
  revalidatePath("/admin/dashboard")
  for (const id of athleteIds) revalidatePath(`/admin/athletes/${id}`)

  return { results, summary: summarize(results), transportError }
}
