import "server-only"

import { PaymentStatus } from "@prisma/client"

import { prisma } from "@/lib/prisma"

import { stampReceiptPreview } from "./cancelled-stamp"
import { buildReceiptSnapshot, loadPaymentForReceipt } from "./issue-receipt"
import { todayInRome } from "./numbering"
import { formatReceiptNumber } from "./numbering-config"
import { loadNumberingContext, peekNextSequence } from "./numbering-context"
import { renderReceiptPdfFromData } from "./receipt-document"

export type ReceiptPreviewResult =
  | { ok: true; pdf: Uint8Array; receiptNumber: string }
  | {
      ok: false
      reason: "NOT_FOUND" | "ALREADY_ISSUED" | "REVERSED" | "NO_SETTINGS"
    }

// Anteprima PDF della ricevuta che verrebbe emessa adesso per un pagamento:
// stessi dati congelati dall'emissione (buildReceiptSnapshot), stesso
// documento (renderReceiptPdfFromData), data di oggi e numero previsto.
// Nessuna scrittura: il contatore si legge senza incrementarlo, niente
// archivio. Filigrana "ANTEPRIMA" su ogni pagina.
export async function renderReceiptPreviewPdf(
  paymentId: string,
): Promise<ReceiptPreviewResult> {
  const payment = await loadPaymentForReceipt(paymentId)
  if (!payment) return { ok: false, reason: "NOT_FOUND" }
  if (payment.receipt) return { ok: false, reason: "ALREADY_ISSUED" }
  if (payment.status === PaymentStatus.REVERSED) {
    return { ok: false, reason: "REVERSED" }
  }

  // Stesse regole dell'emissione, senza scrivere niente: il numero previsto
  // è quello che uscirebbe emettendo adesso
  const issueDate = todayInRome()
  let numbering
  try {
    numbering = await loadNumberingContext(prisma, issueDate)
  } catch {
    return { ok: false, reason: "NO_SETTINGS" }
  }

  const snapshot = buildReceiptSnapshot(payment)
  const receiptNumber = formatReceiptNumber({
    config: numbering.config,
    issueDate,
    academicYearLabel: numbering.academicYearLabel,
    sequence: await peekNextSequence(numbering),
    category: snapshot.category,
  })

  const pdf = await renderReceiptPdfFromData(
    {
      receiptNumber,
      issueDate: todayInRome(),
      payerName: snapshot.payerName,
      payerFiscalCode: snapshot.payerFiscalCode,
      athleteName: snapshot.athleteName,
      athleteFiscalCode: snapshot.athleteFiscalCode,
      athleteAddress: snapshot.athleteAddress,
      feeType: payment.feeType,
      description: snapshot.description,
      lines: snapshot.lines,
      amountCents: snapshot.amountCents,
      method: payment.method,
      paymentMethods: [payment.method],
      paymentDate: payment.paymentDate,
    },
    { paymentId },
  )

  return {
    ok: true,
    receiptNumber,
    pdf: await stampReceiptPreview(pdf, { receiptNumber }),
  }
}
