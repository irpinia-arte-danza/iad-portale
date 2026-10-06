import "server-only"

import { EmailStatus, EmailTrigger } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/resend/send-email"
import { escapeHtml } from "@/lib/resend/template-vars"

// ─────────────────────────────────────────────────────────────────────────
// L'avviso «la tua password è stata cambiata».
//
// È un avviso di sicurezza all'interessato, non una comunicazione alle
// famiglie: l'unica email che parte da sola senza che l'admin la mandi (vedi
// CLAUDE.md, «Flussi email»). Se chi riceve l'avviso non è stato lui, ha il
// tempo di scrivere alla segreteria prima che l'account venga usato. Testo
// fisso nel codice, non nei modelli modificabili: non deve poter sparire.
// ─────────────────────────────────────────────────────────────────────────

export const PASSWORD_CHANGED_MILESTONE = "PASSWORD_CHANGED"

const DATE_IT = new Intl.DateTimeFormat("it-IT", {
  timeZone: "Europe/Rome",
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

export async function sendPasswordChangedNotice(params: {
  userId: string
  email: string
  firstName: string | null
  changedAt: Date
}): Promise<void> {
  const brand = await prisma.brandSettings.findUnique({
    where: { id: 1 },
    select: { asdName: true, asdEmail: true },
  })
  const asdName = brand?.asdName ?? "A.S.D. IAD Irpinia Arte Danza"
  const asdEmail = brand?.asdEmail ?? "info@irpiniaartedanza.it"
  const when = DATE_IT.format(params.changedAt)
  const greeting = params.firstName ? `Gentile ${params.firstName},` : "Gentile socia/o,"

  const subject = `La tua password è stata cambiata — ${asdName}`
  const text = `${greeting}
la password del tuo accesso all'area riservata di ${asdName} è stata cambiata il ${when}.
Le altre sessioni aperte sono state chiuse.
Se non sei stato tu, scrivi subito a ${asdEmail}: l'accesso verrà sospeso finché non lo avremo verificato insieme.
${asdName}`
  const html = `<p>${escapeHtml(greeting)}</p>
<p>la password del tuo accesso all'area riservata di ${escapeHtml(asdName)} è stata cambiata il <strong>${escapeHtml(when)}</strong>. Le altre sessioni aperte sono state chiuse.</p>
<p><strong>Se non sei stato tu</strong>, scrivi subito a <a href="mailto:${escapeHtml(asdEmail)}">${escapeHtml(asdEmail)}</a>: l'accesso verrà sospeso finché non lo avremo verificato insieme.</p>
<hr>
<p><small>${escapeHtml(asdName)}</small></p>`

  const result = await sendEmail({ to: params.email, subject, html, text })

  await prisma.emailLog.create({
    data: {
      sentBy: params.userId,
      recipientEmail: params.email,
      recipientName: params.firstName,
      subject,
      bodyHtml: html,
      bodyText: text,
      status: result.success ? EmailStatus.SENT : EmailStatus.FAILED,
      providerId: result.success ? result.providerId : null,
      errorMessage: result.success ? null : result.error,
      triggeredBy: EmailTrigger.SELF_SERVICE,
      milestoneKey: PASSWORD_CHANGED_MILESTONE,
    },
  })
}
