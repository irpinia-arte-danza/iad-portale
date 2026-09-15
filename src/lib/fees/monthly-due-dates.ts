import { dateOnly } from "@/lib/utils/date-only"

// ─────────────────────────────────────────────────────────────────────────
// Date delle rate mensili di un'iscrizione.
//
// - la prima rata è sempre quella del mese di iscrizione, a importo pieno:
//   chi entra a metà mese paga quel mese ridotto, e l'importo effettivo si
//   registra all'incasso (src/lib/payments/collection-plan.ts)
// - ogni rata scade il giorno di rinnovo dell'anno accademico (default 10),
//   anche quando per il mese di iscrizione è già passato: la quota è dovuta
// - nessuna rata prima del mese di inizio dell'anno accademico né dopo
//   giugno (chiusura estiva)
// Funzione pura.
// ─────────────────────────────────────────────────────────────────────────

// I corsi IAD finiscono a giugno (chiusura estiva luglio/agosto). L'anno
// accademico copre un periodo contabile più ampio: la fine dei corsi è una
// regola a parte, non viene dalla data di fine dell'anno.
const COURSE_SEASON_END_MONTH = 5 // giugno, 0-based

// "2026-2027" → 2027
export function academicYearEndYear(label: string): number | null {
  const parts = label.split("-")
  if (parts.length !== 2) return null
  const year = Number.parseInt(parts[1], 10)
  return Number.isFinite(year) ? year : null
}

function monthIndex(date: Date): number {
  return date.getUTCFullYear() * 12 + date.getUTCMonth()
}

function dueDateInMonth(index: number, renewalDay: number): Date {
  const year = Math.floor(index / 12)
  const month = index % 12
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  return dateOnly(year, month, Math.min(renewalDay, lastDay))
}

export function monthlyDueDates(params: {
  // Colonne @db.Date: date a mezzanotte UTC
  enrollmentDate: Date
  academicYearStart: Date
  academicYearLabel: string
  renewalDay: number
}): Date[] {
  const endYear = academicYearEndYear(params.academicYearLabel)
  if (endYear === null) return []

  const first = Math.max(
    monthIndex(new Date(params.enrollmentDate)),
    monthIndex(new Date(params.academicYearStart)),
  )
  const last = endYear * 12 + COURSE_SEASON_END_MONTH

  const dates: Date[] = []
  for (let index = first; index <= last; index++) {
    dates.push(dueDateInMonth(index, params.renewalDay))
  }
  return dates
}
