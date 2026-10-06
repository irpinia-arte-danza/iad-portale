// Calendario IAD: anno accademico da settembre a giugno (lezioni fino al
// saggio, luglio e agosto non si pagano), anno fiscale = anno solare.
// Le date sono giorni di calendario a mezzanotte UTC (vedi utils/date-only).

const JUNE = 5
const AUGUST = 7
const SEPTEMBER = 8
const DECEMBER = 11

// Da agosto deve esistere l'anno accademico che parte a settembre
export function upcomingAcademicYearLabel(today: Date): string | null {
  if (today.getUTCMonth() < AUGUST) return null
  const year = today.getUTCFullYear()
  return `${year}-${year + 1}`
}

// Da settembre l'anno accademico dell'anno solare è già iniziato
export function isSchoolYearStarted(today: Date): boolean {
  return today.getUTCMonth() >= SEPTEMBER
}

// A dicembre l'anno fiscale successivo va già preparato
export function isNextFiscalYearDue(today: Date): boolean {
  return today.getUTCMonth() === DECEMBER
}

export function fiscalYearOf(date: Date): number {
  return date.getUTCFullYear()
}

// ─────────────────────────────────────────────────────────────────────────
// Quando si può preparare l'anno accademico successivo.
//
// Dal 1° giugno dell'anno in cui finisce l'anno corrente, e fino alla fine
// di quell'anno solare. Prima il tasto "Inizia nuovo anno accademico" era
// sempre visibile: a ottobre, con l'anno appena partito, bastava un tocco
// sbagliato per aprire un passaggio d'anno che non aveva senso.
//
// Il limite in alto (non oltre il 31 dicembre) c'è perché se l'anno corrente
// è finito da più di sei mesi la situazione non è "prepara il prossimo": è
// un'anomalia, e si sistema da "Nuovo anno" guardando cosa manca.
//
// `today` è un giorno di calendario di Roma a mezzanotte UTC
// (todayDateOnly), come tutte le date di questo file.
// ─────────────────────────────────────────────────────────────────────────
export function canPrepareNextAcademicYear(
  currentEndDate: Date,
  today: Date,
): boolean {
  const endYear = currentEndDate.getUTCFullYear()
  return today.getUTCFullYear() === endYear && today.getUTCMonth() >= JUNE
}

// "2026-2027" → "2027-2028". null se l'etichetta non ha quella forma: meglio
// non proporre niente che proporre un anno inventato.
export function nextAcademicYearLabel(label: string): string | null {
  const match = /^(\d{4})-(\d{4})$/.exec(label.trim())
  if (!match) return null
  const start = Number(match[1])
  const end = Number(match[2])
  if (end !== start + 1) return null
  return `${start + 1}-${end + 1}`
}
