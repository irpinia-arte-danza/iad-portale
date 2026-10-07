// Formati condivisi da pagina, footer ed email: senza server-only, perché li
// usano anche i componenti client

const MOMENT_WITH_YEAR = new Intl.DateTimeFormat("it-IT", {
  timeZone: "Europe/Rome",
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

const MOMENT_SHORT = new Intl.DateTimeFormat("it-IT", {
  timeZone: "Europe/Rome",
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
})

// «lun 6 ott 2026, 21:03» (o senza anno: «lun 6 ott, 21:03»)
export function formatAccessMoment(date: Date, options: { year?: boolean } = {}): string {
  return (options.year === false ? MOMENT_SHORT : MOMENT_WITH_YEAR).format(date)
}

const REGION_NAMES = new Intl.DisplayNames(["it"], { type: "region" })

export const UNKNOWN_COUNTRY_LABEL = "paese sconosciuto"

// «Italia», «Francia»; il codice stesso se Intl non lo conosce
export function countryName(code: string | null | undefined): string {
  if (!code) return UNKNOWN_COUNTRY_LABEL
  const upper = code.toUpperCase()
  if (!/^[A-Z]{2}$/.test(upper)) return UNKNOWN_COUNTRY_LABEL
  try {
    return REGION_NAMES.of(upper) ?? upper
  } catch {
    return upper
  }
}
