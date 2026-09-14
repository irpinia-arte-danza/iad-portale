// Date di calendario per le colonne @db.Date (vedi docs/gotchas.md §17.40).
// Postgres salva solo il giorno UTC del valore ricevuto: la mezzanotte locale
// di Roma (22:00/23:00 UTC del giorno prima) finirebbe sul giorno precedente.
// Qui una data di calendario è sempre una Date a mezzanotte UTC.

const ROME_DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Rome",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

// Giorno di calendario a Roma dell'istante dato, a mezzanotte UTC.
// Idempotente sui valori già a mezzanotte UTC (letti dal DB o da
// <input type="date">); corregge mezzanotti locali e `new Date()`.
export function toDateOnly(date: Date): Date {
  const parts = ROME_DAY.formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0")
  return new Date(Date.UTC(get("year"), get("month") - 1, get("day")))
}

export function toDateOnlyOrNull(date: Date | null | undefined): Date | null {
  return date ? toDateOnly(date) : null
}

// Data di calendario da anno, mese (0-11) e giorno. Mai `new Date(y, m, d)`:
// nel browser è la mezzanotte locale.
export function dateOnly(year: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex, day))
}

export function todayDateOnly(now: Date = new Date()): Date {
  return toDateOnly(now)
}
