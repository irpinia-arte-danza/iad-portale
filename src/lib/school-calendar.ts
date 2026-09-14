// Calendario IAD: anno accademico da settembre a giugno (lezioni fino al
// saggio, luglio e agosto non si pagano), anno fiscale = anno solare.
// Le date sono giorni di calendario a mezzanotte UTC (vedi utils/date-only).

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
