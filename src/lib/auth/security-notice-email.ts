import "server-only"

import { EmailStatus, EmailTrigger, UserRole } from "@prisma/client"

import { logError } from "@/lib/logging/log-error"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/resend/send-email"
import { escapeHtml } from "@/lib/resend/template-vars"

import { countryName } from "./access-format"
import type { LoginAnomaly } from "./login-anomaly"

// ─────────────────────────────────────────────────────────────────────────
// Gli avvisi di sicurezza agli admin.
//
// Partono da soli, a ENTRAMBI gli admin, e solo per quattro cose: accesso
// riuscito da un dispositivo nuovo, accesso riuscito da fuori Italia, cinque
// tentativi falliti in dieci minuti, azzeramento del secondo fattore. È la
// stessa eccezione dell'avviso «password cambiata» (#53): avvisi a chi
// amministra, non comunicazioni alle famiglie (CLAUDE.md, «Flussi email»).
// Testo fisso nel codice. Si mandano con after(): se Resend è giù, il login
// va avanti e l'errore finisce nei log.
// ─────────────────────────────────────────────────────────────────────────

export type SecurityNotice =
  | {
      kind: "login"
      userId: string
      anomalies: LoginAnomaly[]
      at: Date
      country: string | null
      device: string
    }
  | {
      kind: "failures"
      userId: string
      count: number
      at: Date
      country: string | null
      device: string
    }
  | { kind: "mfa-reset"; byUserId: string; targetUserId: string; at: Date }

export const SECURITY_MILESTONE: Record<SecurityNotice["kind"], string> = {
  login: "SECURITY_LOGIN",
  failures: "SECURITY_LOGIN_FAILURES",
  "mfa-reset": "SECURITY_MFA_RESET",
}

export const SECURITY_CLOSING_LINE =
  "Se sei stato tu, non devi fare niente. Se non sei stato tu, cambia subito la password e avvisa l'altro admin."

const WHEN = new Intl.DateTimeFormat("it-IT", {
  timeZone: "Europe/Rome",
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
})

type Person = { email: string; firstName: string | null; lastName: string | null }

export function personLabel(p: Person): string {
  const name = [p.firstName, p.lastName].filter(Boolean).join(" ")
  return name ? `${name} (${p.email})` : p.email
}

// Oggetto e righe del messaggio, senza database: così si provano
export function composeSecurityNotice(
  notice: SecurityNotice,
  people: { subject: Person; actor?: Person },
): { subject: string; lines: string[] } {
  const when = WHEN.format(notice.at)
  const who = personLabel(people.subject)
  const first = people.subject.firstName ?? people.subject.email

  if (notice.kind === "login") {
    const where = `da ${notice.device}, ${countryName(notice.country)}`
    const newDevice = notice.anomalies.includes("new-device")
    const foreign = notice.anomalies.includes("foreign-country")
    const subject = newDevice && foreign
      ? "Accesso al portale da un dispositivo nuovo, dall'estero"
      : newDevice
        ? "Accesso al portale da un dispositivo nuovo"
        : `Accesso al portale dall'estero (${countryName(notice.country)})`
    const lines = [
      `Qualcuno è entrato nel portale con l'account amministratore di ${who}: ${when}, ${where}.`,
    ]
    if (newDevice) lines.push("Questo dispositivo non si era mai visto prima per quell'account.")
    if (foreign) lines.push("Il paese da cui è arrivato l'accesso non è l'Italia.")
    lines.push("Lo storico completo è in Impostazioni › Accessi.")
    return { subject, lines }
  }

  if (notice.kind === "failures") {
    return {
      subject: `${notice.count} tentativi di accesso falliti sull'account di ${first}`,
      lines: [
        `Sull'account amministratore di ${who} ci sono stati ${notice.count} tentativi di accesso falliti in dieci minuti, l'ultimo ${when}, da ${notice.device}, ${countryName(notice.country)}.`,
        "L'accesso con quell'email è bloccato per 15 minuti.",
      ],
    }
  }

  const by = people.actor ? personLabel(people.actor) : "L'altro amministratore"
  return {
    subject: `Secondo fattore azzerato per ${first}`,
    lines: [
      `${by} ha azzerato il secondo fattore dell'account amministratore di ${who}: ${when}.`,
      `Al prossimo accesso ${first} dovrà collegare di nuovo l'app Password e riceverà otto codici di recupero nuovi.`,
    ],
  }
}

async function person(userId: string): Promise<Person | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, firstName: true, lastName: true },
  })
}

export async function sendSecurityNotice(notice: SecurityNotice): Promise<void> {
  try {
    const subjectId = notice.kind === "mfa-reset" ? notice.targetUserId : notice.userId
    const actorId = notice.kind === "mfa-reset" ? notice.byUserId : notice.userId
    const [subject, actor, recipients, brand] = await Promise.all([
      person(subjectId),
      notice.kind === "mfa-reset" ? person(notice.byUserId) : Promise.resolve(undefined),
      prisma.user.findMany({
        where: { role: UserRole.ADMIN, isActive: true, deletedAt: null },
        select: { id: true, email: true, firstName: true },
      }),
      prisma.brandSettings.findUnique({ where: { id: 1 }, select: { asdName: true } }),
    ])
    if (!subject) return
    const asdName = brand?.asdName ?? "A.S.D. IAD Irpinia Arte Danza"
    const composed = composeSecurityNotice(notice, { subject, actor: actor ?? undefined })
    const subjectLine = `${composed.subject} — ${asdName}`
    const text = [...composed.lines, "", SECURITY_CLOSING_LINE, "", asdName].join("\n")
    const html = [
      ...composed.lines.map((l) => `<p>${escapeHtml(l)}</p>`),
      `<p><strong>${escapeHtml(SECURITY_CLOSING_LINE)}</strong></p>`,
      "<hr>",
      `<p><small>${escapeHtml(asdName)}</small></p>`,
    ].join("\n")

    for (const recipient of recipients) {
      const result = await sendEmail({ to: recipient.email, subject: subjectLine, html, text })
      if (!result.success) {
        logError("[security] notice not sent", { name: "ResendError", message: result.error }, {
          kind: notice.kind,
        })
      }
      await prisma.emailLog.create({
        data: {
          sentBy: actorId,
          recipientEmail: recipient.email,
          recipientName: recipient.firstName,
          subject: subjectLine,
          bodyHtml: html,
          bodyText: text,
          status: result.success ? EmailStatus.SENT : EmailStatus.FAILED,
          providerId: result.success ? result.providerId : null,
          errorMessage: result.success ? null : result.error,
          triggeredBy: EmailTrigger.SELF_SERVICE,
          milestoneKey: SECURITY_MILESTONE[notice.kind],
        },
      })
    }
  } catch (error) {
    logError("[security] notice failed", error, { kind: notice.kind })
  }
}
