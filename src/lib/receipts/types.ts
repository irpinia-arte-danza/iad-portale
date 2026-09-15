import type { FeeType, PaymentMethod, ReceiptStatus } from "@prisma/client"

// Tipi condivisi client/server per emissione e consultazione ricevute.

export type ReceiptPayerSource =
  | "PAYMENT" // pagante indicato sul pagamento
  | "PRIMARY_PAYER" // genitore segnato "paga le quote"
  | "GUARDIAN" // primo genitore collegato
  | "ATHLETE" // nessun genitore: allieva stessa

// Riga della causale di una ricevuta che copre più scadenze (dato congelato)
export type ReceiptLine = {
  description: string
  amountCents: number
  feeType: FeeType
}

export type IssuedReceiptInfo = {
  id: string
  receiptNumber: string
  issueDate: Date
  status: ReceiptStatus
}

export type ReceiptIssuePreview = {
  paymentId: string
  athleteName: string
  amountCents: number
  feeType: FeeType
  paymentDate: Date
  paymentMethod: PaymentMethod
  existing: IssuedReceiptInfo | null
  payer: {
    name: string
    fiscalCode: string | null
    address: string | null
    source: ReceiptPayerSource
  }
  // Righe della causale (pagamento su più scadenze); vuoto se causale singola
  lines: ReceiptLine[]
  // Motivo per cui l'emissione non è possibile (es. pagamento stornato)
  blocker: string | null
  // Dati mancanti o scelte automatiche da far notare prima di emettere
  warnings: string[]
}

export type IssueReceiptResult =
  | {
      ok: true
      receipt: IssuedReceiptInfo
      alreadyIssued: boolean
      // Emessa ma PDF non archiviato ora (Storage non raggiungibile): si
      // archivia alla prima apertura o dal cron notturno
      pdfDeferred?: boolean
    }
  | { ok: false; error: string }

// URL del PDF: stessa route per admin e genitori, con controlli diversi.
export function receiptPdfHref(receiptId: string): string {
  return `/ricevute/${receiptId}`
}

// Anteprima PDF prima dell'emissione: solo admin, numero previsto, filigrana
export function receiptPreviewPdfHref(paymentId: string): string {
  return `/ricevute/anteprima/${paymentId}`
}
