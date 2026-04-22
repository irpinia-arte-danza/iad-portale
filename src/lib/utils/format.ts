const CURRENCY_IT = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
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

const PERCENT_IT = new Intl.NumberFormat("it-IT", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

export function formatEur(cents: number): string {
  return CURRENCY_IT.format(cents / 100)
}

export function formatDateShort(date: Date): string {
  return DATE_SHORT_IT.format(date)
}

export function formatDateLong(date: Date): string {
  return DATE_LONG_IT.format(date)
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
