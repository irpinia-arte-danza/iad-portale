import "server-only"

import { PaymentStatus } from "@prisma/client"

import { prisma } from "@/lib/prisma"

import { stampReceiptPreview } from "./cancelled-stamp"
import { buildReceiptSnapshot, loadPaymentForReceipt } from "./issue-receipt"
import {
  formatReceiptNumber,
  nextReceiptSequence,
  todayInRome,
} from "./numbering"
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

  const settings = await prisma.receiptSettings.findUnique({
    where: { id: 1 },
    select: { receiptPrefix: true, receiptNumber: true },
  })
  if (!settings) return { ok: false, reason: "NO_SETTINGS" }

  const highest = await prisma.receipt.aggregate({
    where: { receiptNumber: { startsWith: settings.receiptPrefix } },
    _max: { sequence: true },
  })

  const snapshot = buildReceiptSnapshot(payment)
  const receiptNumber = formatReceiptNumber({
    prefix: settings.receiptPrefix,
    academicYearLabel: payment.academicYear.label,
    // L'emissione incrementa il contatore prima di usarlo
    sequence: nextReceiptSequence(
      settings.receiptNumber + 1,
      highest._max.sequence ?? 0,
    ),
    category: snapshot.category,
  })

  const pdf = await renderReceiptPdfFromData(
    {
      receiptNumber,
      issueDate: todayInRome(),
      payerName: snapshot.payerName,
      payerFiscalCode: snapshot.payerFiscalCode,
      payerAddress: snapshot.payerAddress,
      athleteName: snapshot.athleteName,
      athleteFiscalCode: snapshot.athleteFiscalCode,
      feeType: payment.feeType,
      description: snapshot.description,
      lines: snapshot.lines,
      periodStart: payment.periodStart,
      periodEnd: payment.periodEnd,
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
