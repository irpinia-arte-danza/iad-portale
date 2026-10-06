// ─────────────────────────────────────────────────────────────────────────
// L'unico posto dove si formatta un importo.
//
// Prima c'erano diciotto formattatori sparsi (CURRENCY, CURRENCY_IT, EUR,
// euroFormatter, formatEurFromCents nei PDF…): alcuni mettevano il simbolo
// davanti, altri dietro, e i PDF lo calcolavano a mano con una regex.
//
// `useGrouping: true` non è decorativo: per l'italiano il CLDR dice
// minimumGroupingDigits = 2, quindi di default 1035 esce "1035,00 €" senza
// punto e solo da 10.000 in su il separatore compare. Giuseppina legge
// importi di quattro cifre tutti i giorni, e li vuole con il punto.
// ─────────────────────────────────────────────────────────────────────────
const CURRENCY_IT = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  useGrouping: true,
})

const DATE_SHORT_IT = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

const DATE_LONG_IT = new Intl.DateTimeFormat("it-IT", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
})

const DATE_ISO = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

const MONTH_ISO = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
})

const MONTH_LABEL_IT = new Intl.DateTimeFormat("it-IT", {
  month: "short",
  year: "2-digit",
})

const MONTH_FULL_IT = new Intl.DateTimeFormat("it-IT", {
  month: "long",
  year: "numeric",
})

// Giorno di calendario per le intestazioni ("lunedì 6 ottobre"). Il fuso va
// forzato: le date di calendario sono a mezzanotte UTC (§17.40) e su una
// macchina a ovest di Greenwich si leggerebbe il giorno prima.
const DAY_LONG_ROME = new Intl.DateTimeFormat("it-IT", {
  timeZone: "Europe/Rome",
  weekday: "long",
  day: "numeric",
  month: "long",
})

const PERCENT_IT = new Intl.NumberFormat("it-IT", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

/** Importo in centesimi → "1.035,00 €" */
export function formatEuro(cents: number): string {
  return CURRENCY_IT.format(cents / 100)
}

// Stesso formato, senza i centesimi: solo per le etichette degli assi dei
// grafici, dove i valori sono tondi per costruzione e ",00" ripetuto su
// ogni tacca è rumore. Un importo vero si scrive sempre con formatEuro.
const CURRENCY_IT_WHOLE = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  useGrouping: true,
  maximumFractionDigits: 0,
})

/** Etichetta d'asse: importo in centesimi → "1.500 €" */
export function formatEuroAxis(cents: number): string {
  return CURRENCY_IT_WHOLE.format(cents / 100)
}

export function formatDateShort(date: Date): string {
  return DATE_SHORT_IT.format(date)
}

export function formatDateLong(date: Date): string {
  return DATE_LONG_IT.format(date)
}

export function formatDayLongRome(date: Date): string {
  return DAY_LONG_ROME.format(date)
}

export function toDateInputValue(date: Date): string {
  return DATE_ISO.format(date)
}

export function startOfMonth(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function endOfMonth(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
}

export function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function endOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

export function dayKey(date: Date): string {
  return DATE_ISO.format(date)
}

export function monthKey(date: Date): string {
  return MONTH_ISO.format(date)
}

export function monthLabel(date: Date): string {
  return MONTH_LABEL_IT.format(date)
}

export function formatMeseIt(date: Date): string {
  const raw = MONTH_FULL_IT.format(date)
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

export function formatPercent(value: number): string {
  return PERCENT_IT.format(value)
}
