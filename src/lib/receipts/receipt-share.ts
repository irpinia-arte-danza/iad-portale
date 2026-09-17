import { formatDateShort } from "@/lib/utils/format"

// ─────────────────────────────────────────────────────────────────────────
// Stato della condivisione di una ricevuta, ricavato da AuditLog.
//
// Rispetto all'invio per email si sa molto meno, e l'etichetta deve dirlo:
// il foglio di condivisione di iOS sceglie il contatto fuori dalla pagina,
// quindi il gestionale registra che il documento è uscito e quando, mai a
// chi sia arrivato.
// ─────────────────────────────────────────────────────────────────────────

export type ReceiptShareState = {
  lastSharedAt: Date | null
  shareCount: number
}

export const NEVER_SHARED: ReceiptShareState = {
  lastSharedAt: null,
  shareCount: 0,
}

export function wasShared(state: ReceiptShareState): boolean {
  return state.lastSharedAt !== null
}

// "Condivisa dal gestionale il 16/09/2026 — destinatario non registrato"
//
// Le due precisazioni non sono pedanteria. "dal gestionale" dice che
// l'azione è partita da qui, non che è arrivata a qualcuno: dopo il foglio
// di condivisione l'invio può ancora essere annullato dentro WhatsApp.
// "destinatario non registrato" dice che il contatto non è visibile da qui.
// Senza, "Condivisa il 16/09" si legge come "consegnata", che non sappiamo.
export function shareStateLabel(state: ReceiptShareState): string | null {
  if (!state.lastSharedAt) return null
  const times = state.shareCount > 1 ? ` · ${state.shareCount} volte` : ""
  return `Condivisa dal gestionale il ${formatDateShort(state.lastSharedAt)}${times} — destinatario non registrato`
}
