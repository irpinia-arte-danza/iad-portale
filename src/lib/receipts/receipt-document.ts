import "server-only"

import { renderToBuffer } from "@react-pdf/renderer"
import type { FeeType, Prisma } from "@prisma/client"

import {
  ReceiptPdf,
  type ReceiptBrand,
  type ReceiptData,
} from "@/lib/pdf/components/receipt"
import { prisma } from "@/lib/prisma"
import { FEE_TYPE_LABELS } from "@/lib/schemas/payment"

import type { ReceiptLine } from "./types"

// Caricamento e rendering del PDF di una ricevuta già emessa. Il rendering
// produce il file da archiviare (receipt-pdf-store.ts): chi apre la ricevuta
// riceve il file archiviato, non un PDF rigenerato. Nessuna emissione qui: il
// numero nasce solo in issue-receipt.ts.

export type ReceiptRenderErrorCode = "NO_PAYMENT" | "NO_BRAND"

// Errori di dati noti (non transitori), distinti dagli errori del renderer.
export class ReceiptRenderError extends Error {
  readonly code: ReceiptRenderErrorCode

  constructor(code: ReceiptRenderErrorCode, message: string) {
    super(message)
    this.name = "ReceiptRenderError"
    this.code = code
  }
}

export async function loadReceiptForPdf(receiptId: string) {
  return prisma.receipt.findUnique({
    where: { id: receiptId },
    select: {
      id: true,
      receiptNumber: true,
      issueDate: true,
      status: true,
      cancelledAt: true,
      cancelReason: true,
      pdfPath: true,
      payerName: true,
      payerFiscalCode: true,
      payerAddress: true,
      athleteName: true,
      athleteFiscalCode: true,
      description: true,
      amountCents: true,
      lines: true,
      payment: {
        select: {
          athleteId: true,
          feeType: true,
          method: true,
          paymentDate: true,
          periodStart: true,
          periodEnd: true,
          amountCents: true,
          athlete: {
            select: { firstName: true, lastName: true, fiscalCode: true },
          },
        },
      },
    },
  })
}

export type LoadedReceipt = NonNullable<
  Awaited<ReturnType<typeof loadReceiptForPdf>>
>

function athleteNameOf(receipt: LoadedReceipt): string {
  if (receipt.athleteName) return receipt.athleteName
  const athlete = receipt.payment?.athlete
  return athlete ? `${athlete.firstName} ${athlete.lastName}`.trim() : ""
}

// Righe congelate all'emissione (JSON): se non hanno la forma attesa si torna
// alla causale singola invece di rompere il PDF
function parseReceiptLines(value: Prisma.JsonValue | null): ReceiptLine[] | null {
  if (!Array.isArray(value)) return null
  const lines: ReceiptLine[] = []
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null
    const { description, amountCents, feeType } = item
    if (
      typeof description !== "string" ||
      typeof amountCents !== "number" ||
      typeof feeType !== "string" ||
      !(feeType in FEE_TYPE_LABELS)
    ) {
      return null
    }
    lines.push({ description, amountCents, feeType: feeType as FeeType })
  }
  return lines.length >= 2 ? lines : null
}

// PDF "come emesso": anche per una ricevuta già annullata il documento non
// riporta l'annullamento, che si aggiunge in lettura (cancelled-stamp.ts).
// Lancia ReceiptRenderError per dati mancanti, oppure l'errore del renderer.
export async function renderReceiptPdf(receipt: LoadedReceipt): Promise<Buffer> {
  const payment = receipt.payment
  if (!payment) {
    throw new ReceiptRenderError(
      "NO_PAYMENT",
      `Receipt ${receipt.id} is not linked to a payment`,
    )
  }

  const [brand, settings] = await Promise.all([
    prisma.brandSettings.findUnique({
      where: { id: 1 },
      select: {
        asdName: true,
        asdFiscalCode: true,
        asdVatNumber: true,
        asdEmail: true,
        asdPhone: true,
        asdIban: true,
        addressStreet: true,
        addressZip: true,
        addressCity: true,
        addressProvince: true,
        asdAddress: true,
        logoUrl: true,
      },
    }),
    prisma.receiptSettings.findUnique({
      where: { id: 1 },
      select: { receiptFooter: true },
    }),
  ])
  if (!brand) {
    throw new ReceiptRenderError("NO_BRAND", "BrandSettings row (id 1) missing")
  }

  const data: ReceiptData = {
    receiptNumber: receipt.receiptNumber,
    issueDate: receipt.issueDate,
    payerName: receipt.payerName ?? athleteNameOf(receipt),
    payerFiscalCode: receipt.payerFiscalCode,
    payerAddress: receipt.payerAddress,
    athleteName: athleteNameOf(receipt),
    athleteFiscalCode:
      receipt.athleteFiscalCode ?? payment.athlete.fiscalCode ?? null,
    feeType: payment.feeType,
    description: receipt.description,
    lines: parseReceiptLines(receipt.lines),
    periodStart: payment.periodStart,
    periodEnd: payment.periodEnd,
    amountCents: receipt.amountCents ?? payment.amountCents,
    method: payment.method,
    // Una ricevuta copre un solo pagamento (payment_id unico)
    paymentMethods: [payment.method],
    paymentDate: payment.paymentDate,
    receiptFooter: settings?.receiptFooter ?? null,
  }

  const brandData: ReceiptBrand = brand

  try {
    return await renderToBuffer(ReceiptPdf({ receipt: data, brand: brandData }))
  } catch (error) {
    if (!brandData.logoUrl) throw error
    // Il logo (immagine remota, formato caricato dall'admin) non deve impedire
    // la consegna della ricevuta: si ritenta con il marchio testuale, e la
    // causa resta nei log per sistemare il logo.
    console.error(
      "[receipt pdf] render with logo failed, retrying without logo",
      { receiptId: receipt.id },
      error,
    )
    return renderToBuffer(
      ReceiptPdf({ receipt: data, brand: { ...brandData, logoUrl: null } }),
    )
  }
}

const FILENAME_FORBIDDEN = new Set(['"', "<", ">", ":", "|", "?", "*"])

function stripUnsafeFileChars(value: string): string {
  let out = ""
  for (const ch of value) {
    const code = ch.charCodeAt(0)
    if (code < 0x20 || code === 0x7f || FILENAME_FORBIDDEN.has(ch)) continue
    out += ch
  }
  return out
}

// Nome file con numero ricevuta e allieva. Doppia forma per il header
// Content-Disposition: ASCII (compatibilità) + UTF-8 (accenti).
export function receiptPdfFileName(receipt: LoadedReceipt): {
  ascii: string
  utf8: string
} {
  const base = stripUnsafeFileChars(
    `Ricevuta ${receipt.receiptNumber} - ${athleteNameOf(receipt)}`.replace(
      /[/\\]/g,
      "-",
    ),
  )
    .replace(/\s+/g, " ")
    .trim()

  const ascii = base
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^A-Za-z0-9 ._-]/g, "_")

  return { ascii: `${ascii}.pdf`, utf8: `${base}.pdf` }
}
