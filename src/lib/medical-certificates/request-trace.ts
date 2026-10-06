import {
  summarizeReminders,
  type ReminderSummary,
  type ReminderTrace,
} from "@/lib/scadenze/reminder-trace"
import { formatDateShort } from "@/lib/utils/format"

// ─────────────────────────────────────────────────────────────────────────
// L'ultima volta che il certificato è stato chiesto alla famiglia.
//
// Stesse due fonti dei solleciti dei contributi (reminder-trace): le email
// partite dal gestionale e le chat di WhatsApp aperte da qui. Stessa
// cautela: di WhatsApp sappiamo che la chat si è aperta col messaggio già
// scritto, non che sia stato mandato.
//
// Le aperture WhatsApp stanno in AuditLog con la stessa azione dei
// contributi (REMINDER_WHATSAPP_OPENED): le distingue il campo `ambito` nei
// metadati, non un valore nuovo dell'enum.
// ─────────────────────────────────────────────────────────────────────────

// Valore di `changes.ambito` nelle righe di AuditLog
export const REQUEST_SCOPE_CERTIFICATE = "certificato"
export const REQUEST_SCOPE_CONTRIBUTION = "contributo"

export type CertRequestSummary = ReminderSummary

export function summarizeCertRequests(
  traces: ReminderTrace[],
): CertRequestSummary {
  return summarizeReminders(traces)
}

const CHANNEL_LABEL = {
  EMAIL: "per email",
  WHATSAPP: "su WhatsApp",
} as const

// "Mai chiesto" · "Chiesto oggi su WhatsApp" · "Chiesto il 28/09/2026 per email"
export function certRequestLabel(
  summary: CertRequestSummary,
  at: Date = new Date(),
): string {
  if (!summary.last) return "Mai chiesto"
  const quando = isSameRomeDay(summary.last.at, at)
    ? "oggi"
    : `il ${formatDateShort(summary.last.at)}`
  return `Chiesto ${quando} ${CHANNEL_LABEL[summary.last.channel]}`
}

function isSameRomeDay(a: Date, b: Date): boolean {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  return fmt.format(a) === fmt.format(b)
}
