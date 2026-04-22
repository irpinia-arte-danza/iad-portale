import { NextResponse, type NextRequest } from "next/server"
import { Webhook } from "svix"

import { prisma } from "@/lib/prisma"
import { EmailStatus, Prisma } from "@prisma/client"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 10

type ResendEventType =
  | "email.sent"
  | "email.delivered"
  | "email.opened"
  | "email.bounced"
  | "email.complained"
  | "email.delivery_delayed"

type ResendWebhookPayload = {
  type: ResendEventType
  created_at: string
  data: {
    email_id: string
    from?: string
    to?: string[]
    subject?: string
    bounce?: { type?: "hard" | "soft"; message?: string }
  }
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error("[webhook/resend] RESEND_WEBHOOK_SECRET not set")
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 },
    )
  }

  const rawBody = await request.text()
  const headers = Object.fromEntries(request.headers.entries())

  let event: ResendWebhookPayload
  try {
    const wh = new Webhook(webhookSecret)
    event = wh.verify(rawBody, headers) as ResendWebhookPayload
  } catch (err) {
    console.error("[webhook/resend] Signature verification failed", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  const { type, data } = event
  const providerId = data?.email_id

  if (!providerId) {
    console.warn("[webhook/resend] Missing email_id in payload")
    return NextResponse.json({ ok: true, skipped: "no email_id" })
  }

  const emailLog = await prisma.emailLog.findFirst({
    where: { providerId },
    select: {
      id: true,
      status: true,
      deliveredAt: true,
      errorMessage: true,
    },
  })

  if (!emailLog) {
    console.warn(
      `[webhook/resend] EmailLog not found for providerId ${providerId} (type=${type})`,
    )
    return NextResponse.json({ ok: true, skipped: "log not found" })
  }

  const now = new Date()
  let update: Prisma.EmailLogUpdateInput | null = null

  switch (type) {
    case "email.sent":
      break

    case "email.delivered":
      if (emailLog.status === EmailStatus.SENT) {
        update = {
          status: EmailStatus.DELIVERED,
          deliveredAt: now,
        }
      }
      break

    case "email.opened":
      if (
        emailLog.status === EmailStatus.SENT ||
        emailLog.status === EmailStatus.DELIVERED
      ) {
        update = {
          status: EmailStatus.OPENED,
          openedAt: now,
          deliveredAt: emailLog.deliveredAt ?? now,
        }
      }
      break

    case "email.bounced": {
      const bounceMsg = data.bounce
        ? `${data.bounce.type ?? "unknown"}: ${data.bounce.message ?? "no detail"}`
        : emailLog.errorMessage
      update = {
        status: EmailStatus.BOUNCED,
        bouncedAt: now,
        errorMessage: bounceMsg,
      }
      break
    }

    case "email.complained":
      update = {
        status: EmailStatus.COMPLAINED,
        complainedAt: now,
      }
      break

    case "email.delivery_delayed":
      console.info(
        `[webhook/resend] Delivery delayed for ${providerId} (log ${emailLog.id})`,
      )
      break

    default:
      console.warn(`[webhook/resend] Unknown event type: ${type}`)
  }

  if (update) {
    try {
      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: update,
      })
    } catch (err) {
      console.error(
        `[webhook/resend] Update failed for ${emailLog.id}`,
        err,
      )
      return NextResponse.json({ error: "Update failed" }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true, type, providerId })
}
