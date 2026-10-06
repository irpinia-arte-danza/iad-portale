// ─────────────────────────────────────────────────────────────────────────
// Quale anno sta guardando una pagina.
//
// Il portale ha tre calendari: l'anno accademico (settembre–giugno), l'anno
// fiscale (gennaio–dicembre) e l'anno sociale dell'ente. Nell'intestazione
// c'era sempre il chip "AA 2026-2027", anche nelle pagine contabili, dove
// conviveva con un "2026" senza etichetta: due anni diversi sulla stessa
// schermata, senza spiegazione.
//
// Regola: dove la pagina è ad anno fiscale il chip dell'anno accademico non
// si mostra, perché l'anno lo dice il selettore accanto al titolo (o il
// periodo scelto). Resta nelle pagine ad anno accademico e in quelle che non
// dipendono da un anno, dove dice su quale anno lavora il portale.
// ─────────────────────────────────────────────────────────────────────────

// Le pagine che ragionano per anno fiscale (solare)
const FISCAL_PATHS = ["/admin/receipts", "/admin/reports"]

export function isFiscalYearPage(pathname: string): boolean {
  return FISCAL_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  )
}

/** Il chip "AA …" dell'intestazione: assente nelle pagine fiscali */
export function showsAcademicYearChip(pathname: string): boolean {
  return !isFiscalYearPage(pathname)
}

/**
 * La fascia "Stai guardando il …": solo quando l'anno scelto non è quello
 * corrente. null = niente fascia (anno corrente, o non si sa quale sia il
 * corrente: meglio non avvisare che avvisare a caso).
 */
export function yearNotCurrentNotice(
  selected: string | null,
  current: string | null,
): string | null {
  if (selected === null || current === null) return null
  if (selected === current) return null
  return `Stai guardando il ${selected}`
}

export type IsoRange = { from: string; to: string }

/** L'anno solare come periodo: 1° gennaio – 31 dicembre */
export function calendarYearRange(year: number): IsoRange {
  return { from: `${year}-01-01`, to: `${year}-12-31` }
}

/**
 * L'anno fiscale a cui appartiene un periodo, o null se sta a cavallo di
 * due anni: lì non c'è un anno solo da mostrare.
 */
export function fiscalYearOfRange(range: IsoRange): number | null {
  const fromYear = Number(range.from.slice(0, 4))
  const toYear = Number(range.to.slice(0, 4))
  if (!Number.isInteger(fromYear) || fromYear !== toYear) return null
  return fromYear
}
