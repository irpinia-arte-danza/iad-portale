import type { ReceiptStatus } from "@prisma/client"

import { formatDateShort } from "@/lib/utils/format"

// ─────────────────────────────────────────────────────────────────────────
// La ricevuta è arrivata alla famiglia?
//
// Tre modi, e valgono tutti e tre:
// • email inviata — EmailLog con esito non fallito;
// • condivisa dal gestionale — il foglio di condivisione di iOS (#17): si sa
//   che è uscita da qui, non a chi è arrivata;
// • consegnata a mano — Giuseppina l'ha stampata e data allo sportello, e lo
//   segna dal gestionale.
//
// Una ricevuta annullata non è "da consegnare": non è più un documento
// valido, e proporre di mandarla sarebbe un errore.
//
// Un predicato solo, usato dal chip dell'elenco, dal riquadro della dashboard
// e dal contatore del menu: i tre numeri non possono divergere.
// ─────────────────────────────────────────────────────────────────────────

export type DeliveryChannel = "EMAIL" | "SHARE" | "HAND"

export type DeliveryInput = {
  status: ReceiptStatus
  // Ultimo invio riuscito, ultima condivisione, ultima consegna a mano
  emailSentAt: Date | null
  sharedAt: Date | null
  handDeliveredAt: Date | null
}

export type DeliveryState = {
  cancelled: boolean
  delivered: boolean
  // Come e quando è uscita l'ultima volta; null se non è mai uscita
  last: { at: Date; channel: DeliveryChannel } | null
}

export function deliveryState(input: DeliveryInput): DeliveryState {
  const cancelled = input.status === "CANCELLED"

  const traces: { at: Date; channel: DeliveryChannel }[] = []
  if (input.emailSentAt) traces.push({ at: input.emailSentAt, channel: "EMAIL" })
  if (input.sharedAt) traces.push({ at: input.sharedAt, channel: "SHARE" })
  if (input.handDeliveredAt) {
    traces.push({ at: input.handDeliveredAt, channel: "HAND" })
  }

  const last =
    traces.length === 0
      ? null
      : traces.reduce((latest, t) =>
          t.at.getTime() > latest.at.getTime() ? t : latest,
        )

  return { cancelled, delivered: traces.length > 0, last }
}

// Da consegnare: valida e mai uscita da qui in nessuno dei tre modi
export function isToDeliver(state: DeliveryState): boolean {
  return !state.cancelled && !state.delivered
}

const CHANNEL_LABEL: Record<DeliveryChannel, string> = {
  EMAIL: "Inviata",
  SHARE: "Condivisa",
  HAND: "Consegnata a mano",
}

export type DeliveryTone = "amber" | "neutral" | "muted"

// "Inviata il 28/09/2026" · "Da consegnare" · "Annullata"
export function deliveryLabel(state: DeliveryState): {
  text: string
  tone: DeliveryTone
} {
  if (state.cancelled) return { text: "Annullata", tone: "muted" }
  if (!state.last) return { text: "Da consegnare", tone: "amber" }
  return {
    text: `${CHANNEL_LABEL[state.last.channel]} il ${formatDateShort(state.last.at)}`,
    tone: "neutral",
  }
}

// ─────────────────────────────────────────────────────────────────────────
// La barra della selezione.
//
// Le ricevute senza email restano selezionabili — si consegnano a mano, e
// toglierle dalla selezione sarebbe un modo per nasconderle — ma dalla
// selezione non parte niente per loro, e la barra deve dirlo prima di
// premere.
// ─────────────────────────────────────────────────────────────────────────

export type BulkSelectionSummary = {
  total: number
  withEmail: number
  withoutEmail: number
  // "3 email · 2 senza email, da dare a mano"
  label: string
}

export function bulkSelectionSummary(
  selected: { emailBlocker: string | null }[],
): BulkSelectionSummary {
  const total = selected.length
  const withEmail = selected.filter((r) => r.emailBlocker === null).length
  const withoutEmail = total - withEmail

  const parts = [`${withEmail} ${withEmail === 1 ? "email" : "email"}`]
  if (withoutEmail > 0) {
    parts.push(`${withoutEmail} senza email, da dare a mano`)
  }

  return { total, withEmail, withoutEmail, label: parts.join(" · ") }
}
