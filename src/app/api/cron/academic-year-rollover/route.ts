import { NextResponse, type NextRequest } from "next/server"

import { EmailStatus, EmailTrigger, UserRole } from "@prisma/client"

import { syncFiscalYears } from "@/lib/fiscal-years"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/resend/send-email"
import {
  isSchoolYearStarted,
  upcomingAcademicYearLabel,
} from "@/lib/school-calendar"
import { todayDateOnly } from "@/lib/utils/date-only"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Cron notturno degli anni accademico e fiscale. Tre passi indipendenti: se
// uno fallisce gli altri girano comunque.
//
// 1. Anno accademico corrente
//    - 1 AA copre oggi e non è corrente → diventa corrente (AY_AUTO_SET_CURRENT)
//    - 0 AA coprono oggi (luglio-agosto, o anno nuovo non ancora creato) →
//      il corrente NON si tocca: resta l'ultimo anno finché non parte il
//      successivo. Solo warning nei log.
//    - N>1 sovrapposti → skip + warning (va risolto a mano)
// 2. Anno fiscale: crea l'anno solare in corso (a dicembre anche il
//    successivo) e dal 1° gennaio lo imposta come corrente.
// 3. Da agosto, se manca l'anno accademico che parte a settembre, email agli
//    admin: una sola per admin e per anno (dedup su EmailLog.milestoneKey).
//
// Override manuale dell'AA: setCurrentAcademicYear action.

const LOG_PREFIX = "[cron/academic-year-rollover]"
const NEXT_AY_MISSING_MILESTONE = "AY_NEXT_MISSING"

type StepError = { action: "error" }

type AcademicYearStep =
  | { action: "promoted"; label: string; previousCurrent: string | null }
  | { action: "skipped"; reason: "already-current"; label: string }
  | {
      action: "skipped"
      reason: "no-academic-year-covers-today"
      current: string | null
    }
  | { action: "skipped"; reason: "multiple-overlap"; candidates: string[] }

type NextAcademicYearStep =
  | { action: "not-due" }
  | { action: "exists"; label: string }
  | {
      action: "skipped"
      label: string
      reason: "no-admin-sender" | "app-url-missing"
    }
  | {
      action: "notified"
      label: string
      sent: number
      failed: number
      alreadyNotified: number
    }

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get("authorization")
  const isVercelCron = req.headers.get("x-vercel-cron") === "1"
  const secret = process.env.CRON_SECRET
  const isDev = process.env.NODE_ENV === "development"

  // Dev bypass: in sviluppo locale (NODE_ENV=development) accettiamo
  // chiamate senza auth header per facilitare test da browser/curl.
  // In production il bypass è inattivo: serve sempre x-vercel-cron OR
  // Bearer ${CRON_SECRET}.
  if (!isDev) {
    if (!secret) {
      console.error(`${LOG_PREFIX} CRON_SECRET not configured`)
      return NextResponse.json(
        { ok: false, error: "CRON_SECRET not configured" },
        { status: 500 },
      )
    }

    const authorized = isVercelCron || authHeader === `Bearer ${secret}`
    if (!authorized) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 },
      )
    }
  }

  // Giorno di calendario a Roma (non UTC: tra mezzanotte e le 2 sarebbe ieri)
  const today = todayDateOnly()
  const actorId = await systemAdminId()

  const academicYear = await runStep("academic-year", () =>
    rolloverAcademicYear(today, actorId),
  )
  const fiscalYear = await runStep("fiscal-year", () =>
    syncFiscalYears(today, actorId),
  )
  const nextAcademicYear = await runStep("next-academic-year", () =>
    notifyMissingNextAcademicYear(today, actorId),
  )

  const ok = [academicYear, fiscalYear, nextAcademicYear].every(
    (step) => step.action !== "error",
  )

  return NextResponse.json(
    {
      ok,
      today: today.toISOString(),
      academicYear,
      fiscalYear,
      nextAcademicYear,
    },
    { status: ok ? 200 : 500 },
  )
}

async function runStep<T>(
  name: string,
  step: () => Promise<T>,
): Promise<T | StepError> {
  try {
    return await step()
  } catch (error) {
    console.error(`${LOG_PREFIX} step ${name} failed`, error)
    return { action: "error" }
  }
}

// Actor per audit ed EmailLog: il cron non ha un utente, si usa il primo
// admin attivo per createdAt.
async function systemAdminId(): Promise<string | null> {
  const firstAdmin = await prisma.user.findFirst({
    where: { role: UserRole.ADMIN, isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  })
  return firstAdmin?.id ?? null
}

async function rolloverAcademicYear(
  today: Date,
  actorId: string | null,
): Promise<AcademicYearStep> {
  const candidates = await prisma.academicYear.findMany({
    where: {
      startDate: { lte: today },
      endDate: { gte: today },
    },
    select: { id: true, label: true, isCurrent: true },
    orderBy: { startDate: "desc" },
  })

  if (candidates.length === 0) {
    // Mai azzerare il corrente: senza anno corrente iscrizioni, pagamenti e
    // aree genitori/insegnanti si bloccano. D'estate resta l'anno appena
    // concluso; il successivo diventa corrente quando parte.
    const current = await prisma.academicYear.findFirst({
      where: { isCurrent: true },
      select: { label: true },
    })
    console.warn(
      `${LOG_PREFIX} no academic year covers today, current left unchanged`,
      { today: today.toISOString(), current: current?.label ?? null },
    )
    return {
      action: "skipped",
      reason: "no-academic-year-covers-today",
      current: current?.label ?? null,
    }
  }

  if (candidates.length > 1) {
    console.warn(`${LOG_PREFIX} multiple academic years overlap today`, {
      today: today.toISOString(),
      candidates: candidates.map((c) => ({ id: c.id, label: c.label })),
    })
    return {
      action: "skipped",
      reason: "multiple-overlap",
      candidates: candidates.map((c) => c.label),
    }
  }

  const target = candidates[0]
  if (target.isCurrent) {
    return { action: "skipped", reason: "already-current", label: target.label }
  }

  const previousCurrent = await prisma.academicYear.findFirst({
    where: { isCurrent: true, NOT: { id: target.id } },
    select: { label: true },
  })

  await prisma.$transaction([
    prisma.academicYear.updateMany({
      where: { isCurrent: true, NOT: { id: target.id } },
      data: { isCurrent: false },
    }),
    prisma.academicYear.update({
      where: { id: target.id },
      data: { isCurrent: true },
    }),
    prisma.auditLog.create({
      data: {
        userId: actorId,
        action: "AY_AUTO_SET_CURRENT",
        entityType: "AcademicYear",
        entityId: target.id,
        changes: {
          label: target.label,
          previousCurrent: previousCurrent?.label ?? null,
          today: today.toISOString(),
        },
      },
    }),
  ])

  return {
    action: "promoted",
    label: target.label,
    previousCurrent: previousCurrent?.label ?? null,
  }
}

async function notifyMissingNextAcademicYear(
  today: Date,
  senderId: string | null,
): Promise<NextAcademicYearStep> {
  const label = upcomingAcademicYearLabel(today)
  if (!label) return { action: "not-due" }

  const existing = await prisma.academicYear.findUnique({
    where: { label },
    select: { id: true },
  })
  if (existing) return { action: "exists", label }

  console.warn(`${LOG_PREFIX} next academic year not created`, { label })

  if (!senderId) return { action: "skipped", label, reason: "no-admin-sender" }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "")
  if (!appUrl) {
    console.error(`${LOG_PREFIX} NEXT_PUBLIC_APP_URL missing, email not sent`)
    return { action: "skipped", label, reason: "app-url-missing" }
  }

  const milestoneKey = `${NEXT_AY_MISSING_MILESTONE}:${label}`
  const [admins, alreadyLogged] = await Promise.all([
    prisma.user.findMany({
      where: { role: UserRole.ADMIN, isActive: true },
      orderBy: { createdAt: "asc" },
      select: { email: true, firstName: true, lastName: true },
    }),
    prisma.emailLog.findMany({
      where: { milestoneKey, status: { not: EmailStatus.FAILED } },
      select: { recipientEmail: true },
    }),
  ])

  const notified = new Set(
    alreadyLogged.map((log) => log.recipientEmail.toLowerCase()),
  )
  const email = renderMissingYearEmail(
    label,
    `${appUrl}/admin/academic-years`,
    isSchoolYearStarted(today),
  )

  let sent = 0
  let failed = 0
  let alreadyNotified = 0

  for (const admin of admins) {
    if (notified.has(admin.email.toLowerCase())) {
      alreadyNotified++
      continue
    }

    const result = await sendEmail({
      to: admin.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
    })

    await prisma.emailLog.create({
      data: {
        sentBy: senderId,
        recipientEmail: admin.email,
        recipientName:
          [admin.firstName, admin.lastName].filter(Boolean).join(" ") || null,
        subject: email.subject,
        bodyHtml: email.html,
        bodyText: email.text,
        status: result.success ? EmailStatus.SENT : EmailStatus.FAILED,
        providerId: result.success ? result.providerId : null,
        errorMessage: result.success ? null : result.error,
        triggeredBy: EmailTrigger.CRON,
        milestoneKey,
      },
    })

    if (result.success) {
      sent++
    } else {
      failed++
      console.error(`${LOG_PREFIX} next academic year email failed`, {
        label,
        code: result.code,
      })
    }
  }

  return { action: "notified", label, sent, failed, alreadyNotified }
}

function renderMissingYearEmail(
  label: string,
  link: string,
  schoolYearStarted: boolean,
): { subject: string; html: string; text: string } {
  const [startYear] = label.split("-")
  const when = schoolYearStarted
    ? "Settembre è già iniziato: va creato subito."
    : `Va creato prima del 1° settembre ${startYear}.`
  const why =
    "Finché manca resta corrente l'anno precedente, e le nuove iscrizioni ai corsi finirebbero sull'anno sbagliato."
  const footer =
    "Avviso automatico del portale, inviato una sola volta. Finché l'anno manca lo trovi anche nella dashboard."

  const subject = `Anno accademico ${label} da creare`
  const text = [
    "Ciao,",
    "",
    `l'anno accademico ${label} non è ancora stato creato nel portale IAD.`,
    `${when} ${why}`,
    "",
    `Crealo da Anni accademici: ${link}`,
    "",
    footer,
  ].join("\n")
  const html = [
    "<p>Ciao,</p>",
    `<p>l'anno accademico <strong>${label}</strong> non è ancora stato creato nel portale IAD.</p>`,
    `<p>${when} ${why}</p>`,
    `<p><a href="${link}">Crea l'anno accademico ${label}</a></p>`,
    `<p style="color:#6b7280;font-size:12px">${footer}</p>`,
  ].join("\n")

  return { subject, html, text }
}
