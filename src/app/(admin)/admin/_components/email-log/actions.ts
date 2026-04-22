"use server"

import { revalidatePath } from "next/cache"

import { EmailStatus, EmailTrigger } from "@prisma/client"

import { requireAdmin } from "@/lib/auth/require-admin"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/resend/send-email"

export type ResendEmailResult = {
  ok: boolean
  error?: string
  newLogId?: string
}

export async function resendFromLog(
  logId: string,
): Promise<ResendEmailResult> {
  const admin = await requireAdmin()

  const log = await prisma.emailLog.findUnique({
    where: { id: logId },
  })

  if (!log) {
    return { ok: false, error: "Log non trovato" }
  }

  if (log.status !== EmailStatus.FAILED) {
    return {
      ok: false,
      error: "Solo email con stato FAILED possono essere reinviate",
    }
  }

  const result = await sendEmail({
    to: log.recipientEmail,
    subject: log.subject,
    html: log.bodyHtml,
    text: log.bodyText ?? undefined,
  })

  const newLog = await prisma.emailLog.create({
    data: {
      sentBy: admin.userId,
      recipientEmail: log.recipientEmail,
      recipientName: log.recipientName,
      templateSlug: log.templateSlug,
      subject: log.subject,
      bodyHtml: log.bodyHtml,
      bodyText: log.bodyText,
      athleteId: log.athleteId,
      parentId: log.parentId,
      paymentScheduleId: log.paymentScheduleId,
      status: result.success ? EmailStatus.SENT : EmailStatus.FAILED,
      providerId: result.success ? result.providerId : null,
      errorMessage: result.success ? null : result.error,
      triggeredBy: EmailTrigger.ADMIN_MANUAL,
      milestoneKey: null,
    },
    select: { id: true },
  })

  if (log.athleteId) revalidatePath(`/admin/athletes/${log.athleteId}`)
  if (log.parentId) revalidatePath(`/admin/parents/${log.parentId}`)

  if (!result.success) {
    return { ok: false, error: result.error, newLogId: newLog.id }
  }

  return { ok: true, newLogId: newLog.id }
}
