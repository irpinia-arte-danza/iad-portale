import { formatDateShort } from "@/lib/utils/format"

// ─────────────────────────────────────────────────────────────────────────
// Quante volte una scadenza è stata sollecitata, e come.
//
// Due fonti, due cose diverse:
// • EmailLog — l'email è partita dal gestionale verso un indirizzo;
// • AuditLog (REMINDER_WHATSAPP_OPENED) — la chat di WhatsApp è stata aperta
//   con il messaggio già scritto. Che poi Giuseppina abbia premuto invio non
//   lo sappiamo: wa.me apre WhatsApp e lì il gestionale non vede più niente.
//   Stesso principio della ricevuta condivisa (receipt-share.ts).
//
// L'etichetta non promette più di quello che sappiamo: "sollecitata" dice che
// il sollecito è partito da qui, non che è stato letto.
// ─────────────────────────────────────────────────────────────────────────

export type ReminderChannel = "EMAIL" | "WHATSAPP"

export type ReminderTrace = {
  at: Date
  channel: ReminderChannel
}

export type ReminderSummary = {
  count: number
  last: ReminderTrace | null
}

export const NEVER_REMINDED: ReminderSummary = { count: 0, last: null }

export function summarizeReminders(traces: ReminderTrace[]): ReminderSummary {
  if (traces.length === 0) return NEVER_REMINDED
  const last = traces.reduce((latest, trace) =>
    trace.at.getTime() > latest.at.getTime() ? trace : latest,
  )
  return { count: traces.length, last }
}

const CHANNEL_LABEL: Record<ReminderChannel, string> = {
  EMAIL: "per email",
  WHATSAPP: "su WhatsApp",
}

// "Mai sollecitata" · "Sollecitata 2 volte · ultima 28/09 su WhatsApp"
export function reminderSummaryLabel(
  summary: ReminderSummary,
  at: Date = new Date(),
): string {
  if (!summary.last) return "Mai sollecitata"

  const volte = summary.count === 1 ? "1 volta" : `${summary.count} volte`
  const quando = isSameDay(summary.last.at, at)
    ? "oggi"
    : formatDateShort(summary.last.at)
  const come = CHANNEL_LABEL[summary.last.channel]

  return `Sollecitata ${volte} · ultima ${quando} ${come}`
}

// Confronto sul giorno di Roma: "oggi" deve valere anche per un sollecito
// mandato alle 23:30
function isSameDay(a: Date, b: Date): boolean {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  return fmt.format(a) === fmt.format(b)
}
