import type { ReceiptStatus } from "@prisma/client"

// ─────────────────────────────────────────────────────────────────────────
// Regole di invio della ricevuta per email. Funzioni pure: le usano la
// action sul server, l'elenco per decidere cosa è selezionabile e i test.
//
// Il destinatario è SOLO il pagante congelato sulla ricevuta (payerEmail),
// mai un indirizzo ricavato al momento dal pagamento: fra l'emissione e
// l'invio i genitori collegati possono cambiare, e con genitori separati
// manderebbe a uno i dati fiscali dell'altro.
// ─────────────────────────────────────────────────────────────────────────

export type ReceiptForEmail = {
  status: ReceiptStatus
  payerName: string | null
  payerEmail: string | null
}

export type ReceiptEmailBlockKind = "CANCELLED" | "NO_EMAIL"

export function receiptEmailBlockKind(
  receipt: ReceiptForEmail,
): ReceiptEmailBlockKind | null {
  if (receipt.status === "CANCELLED") return "CANCELLED"
  const email = receipt.payerEmail?.trim()
  if (!email) return "NO_EMAIL"
  return null
}

export function receiptEmailBlockMessage(kind: ReceiptEmailBlockKind): string {
  if (kind === "CANCELLED") {
    return "La ricevuta è annullata: non si invia un documento che non è più valido."
  }
  return "La ricevuta non ha l'email del pagante: va consegnata a mano. L'indirizzo viene congelato all'emissione, quindi aggiungerlo ora alla scheda del genitore non cambia le ricevute già emesse."
}

// Motivo per cui non si può inviare, già in italiano; null se si può
export function receiptEmailBlocker(receipt: ReceiptForEmail): string | null {
  const kind = receiptEmailBlockKind(receipt)
  return kind ? receiptEmailBlockMessage(kind) : null
}

export function canSendReceiptEmail(receipt: ReceiptForEmail): boolean {
  return receiptEmailBlockKind(receipt) === null
}

// Stato dell'invio ricavato da EmailLog (nessun campo su receipts)
export type ReceiptEmailState = {
  lastSentAt: Date | null
  lastRecipient: string | null
  sendCount: number
}

export const NEVER_SENT: ReceiptEmailState = {
  lastSentAt: null,
  lastRecipient: null,
  sendCount: 0,
}

export function wasSent(state: ReceiptEmailState): boolean {
  return state.lastSentAt !== null
}

// Etichetta del bottone: la ripetizione è permessa, ma deve dirsi
export function sendButtonLabel(state: ReceiptEmailState): string {
  return wasSent(state) ? "Invia di nuovo" : "Invia per email"
}

export const RECEIPT_EMAIL_TEMPLATE_SLUG = "ricevuta-emessa"

// Limite Resend: 40 MB per email dopo la codifica base64, che gonfia il file
// di circa un terzo. Una ricevuta pesa ~5 KB, quindi il caso non si presenta;
// se un giorno si presentasse, meglio un messaggio chiaro dell'errore del
// provider a metà invio.
export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024

export function attachmentTooLarge(bytes: number): boolean {
  return bytes > MAX_ATTACHMENT_BYTES
}
