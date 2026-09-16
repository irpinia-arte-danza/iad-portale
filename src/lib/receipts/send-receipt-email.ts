import "server-only"

import { AuditAction, EmailStatus, EmailTrigger } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { renderTemplate } from "@/lib/resend/render-template"
import { sendEmail } from "@/lib/resend/send-email"
import { formatDateShort, formatEur } from "@/lib/utils/format"

import {
  attachmentTooLarge,
  receiptEmailBlocker,
  RECEIPT_EMAIL_TEMPLATE_SLUG,
} from "./receipt-email"
import { loadReceiptForPdf, receiptPdfFileName } from "./receipt-document"
import { ReceiptArchiveError, readReceiptPdf } from "./receipt-pdf-store"

// ─────────────────────────────────────────────────────────────────────────
// Invio della ricevuta per email, con il PDF in allegato.
//
// - il destinatario è SOLO il pagante congelato sulla ricevuta (payerEmail):
//   mai un indirizzo ricavato adesso dal pagamento, mai gli altri genitori
// - l'allegato è il file archiviato, identico a quello emesso; se manca si
//   genera e si archivia prima di mandare (stessa regola di /ricevute/[id])
// - ogni invio lascia una riga in EmailLog (anche fallito) e, se riuscito,
//   una in AuditLog. La ripetizione è permessa: lo storico le mostra tutte
// - l'allegato esclude l'API batch di Resend, che non li supporta: l'invio
//   multiplo è un ciclo di invii singoli
// ─────────────────────────────────────────────────────────────────────────

export type SendReceiptEmailCode =
  | "NOT_FOUND"
  | "BLOCKED"
  | "ARCHIVE_UNAVAILABLE"
  | "TEMPLATE"
  | "TOO_LARGE"
  | "QUOTA"
  | "RATE_LIMIT"
  | "SEND_FAILED"

export type SendReceiptEmailResult =
  | { ok: true; recipient: string; receiptNumber: string }
  | { ok: false; code: SendReceiptEmailCode; error: string }

// Codici del provider che non riguardano la singola email: con questi non ha
// senso proseguire su un elenco, si ferma e si riprende più tardi.
function providerCode(code: string | undefined): SendReceiptEmailCode {
  if (code === "daily_quota_exceeded") return "QUOTA"
  if (code === "rate_limit_exceeded") return "RATE_LIMIT"
  return "SEND_FAILED"
}

function providerMessage(code: SendReceiptEmailCode, fallback: string): string {
  if (code === "QUOTA") {
    return "Il limite giornaliero di email è esaurito (100 al giorno sul piano Free): riprendi domani con le ricevute rimaste."
  }
  if (code === "RATE_LIMIT") {
    return "Il servizio email ha ricevuto troppe richieste di seguito: attendi qualche minuto e riprendi con le ricevute rimaste."
  }
  return fallback
}

export async function sendReceiptEmailCore(params: {
  receiptId: string
  adminUserId: string
}): Promise<SendReceiptEmailResult> {
  const receipt = await loadReceiptForPdf(params.receiptId)
  if (!receipt) {
    return { ok: false, code: "NOT_FOUND", error: "Ricevuta non trovata" }
  }

  const blocker = receiptEmailBlocker(receipt)
  if (blocker) return { ok: false, code: "BLOCKED", error: blocker }

  // receiptEmailBlocker ha già escluso il caso senza email
  const recipient = receipt.payerEmail!.trim()

  let pdf: Uint8Array
  try {
    const stored = await readReceiptPdf(receipt)
    pdf = stored.pdf
  } catch (error) {
    const code =
      error instanceof ReceiptArchiveError ? error.code : "RENDER_FAILED"
    console.error(
      "[receipt email] pdf not available",
      { receiptId: receipt.id, code },
      error,
    )
    return {
      ok: false,
      code: "ARCHIVE_UNAVAILABLE",
      error:
        code === "STORED_FILE_MISSING"
          ? "Il PDF archiviato di questa ricevuta non si trova: non viene rigenerato per non mandare un documento diverso dall'originale."
          : "L'archivio delle ricevute non risponde in questo momento: riprova tra qualche minuto.",
    }
  }

  if (attachmentTooLarge(pdf.byteLength)) {
    return {
      ok: false,
      code: "TOO_LARGE",
      error:
        "Il PDF è troppo grande per essere allegato a un'email: consegnalo a mano.",
    }
  }

  const athleteName =
    receipt.athleteName ??
    `${receipt.payment?.athlete.firstName ?? ""} ${receipt.payment?.athlete.lastName ?? ""}`.trim()

  let rendered
  try {
    rendered = await renderTemplate(RECEIPT_EMAIL_TEMPLATE_SLUG, {
      genitore_nome: receipt.payerName ?? "",
      allieva_nome: athleteName,
      numero_ricevuta: receipt.receiptNumber,
      data_ricevuta: formatDateShort(receipt.issueDate),
      importo: formatEur(receipt.amountCents ?? receipt.payment?.amountCents ?? 0),
    })
  } catch (error) {
    console.error("[receipt email] template error", { receiptId: receipt.id }, error)
    return {
      ok: false,
      code: "TEMPLATE",
      error:
        "Il template «ricevuta-emessa» manca o è disattivato: controllalo in Impostazioni → Template email.",
    }
  }

  const { utf8 } = receiptPdfFileName(receipt)
  const result = await sendEmail({
    to: recipient,
    subject: rendered.subject,
    html: rendered.bodyHtml,
    text: rendered.bodyText ?? undefined,
    attachments: [{ filename: utf8, content: Buffer.from(pdf) }],
  })

  const code = result.success ? null : providerCode(result.code)

  await prisma.emailLog.create({
    data: {
      sentBy: params.adminUserId,
      recipientEmail: recipient,
      recipientName: receipt.payerName,
      templateSlug: RECEIPT_EMAIL_TEMPLATE_SLUG,
      subject: rendered.subject,
      bodyHtml: rendered.bodyHtml,
      bodyText: rendered.bodyText,
      receiptId: receipt.id,
      athleteId: receipt.payment?.athleteId ?? null,
      parentId: receipt.payerId,
      status: result.success ? EmailStatus.SENT : EmailStatus.FAILED,
      providerId: result.success ? result.providerId : null,
      errorMessage: result.success ? null : result.error,
      triggeredBy: EmailTrigger.ADMIN_MANUAL,
    },
  })

  if (!result.success) {
    return {
      ok: false,
      code: code ?? "SEND_FAILED",
      error: providerMessage(
        code ?? "SEND_FAILED",
        `Invio non riuscito: ${result.error}`,
      ),
    }
  }

  await prisma.auditLog.create({
    data: {
      userId: params.adminUserId,
      action: AuditAction.RECEIPT_EMAIL_SENT,
      entityType: "Receipt",
      entityId: receipt.id,
      changes: {
        receiptNumber: receipt.receiptNumber,
        recipient,
        attachmentBytes: pdf.byteLength,
      },
    },
  })

  return { ok: true, recipient, receiptNumber: receipt.receiptNumber }
}
