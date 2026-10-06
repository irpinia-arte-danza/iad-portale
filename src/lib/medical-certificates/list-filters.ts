import type { CertStatus } from "./certificate-status"

// ─────────────────────────────────────────────────────────────────────────
// I filtri dell'elenco Certificati.
//
// Nell'URL (?status=), con gli stessi valori che usano già i riquadri della
// dashboard: missing, expired, expiring. I conteggi dei chip si fanno sulle
// stesse righe dell'elenco, classificate da classifyCert — la funzione che
// conta anche i riquadri e il badge del menu — quindi i tre posti dicono lo
// stesso numero.
// ─────────────────────────────────────────────────────────────────────────

export type CertListFilter = CertStatus | "all"

// L'ordine dei chip: prima quello che blocca la lezione
export const CERT_FILTER_ORDER: CertListFilter[] = [
  "missing",
  "expired",
  "expiring",
  "valid",
  "all",
]

export const CERT_FILTER_LABELS: Record<CertListFilter, string> = {
  missing: "Mancanti",
  expired: "Scaduti",
  expiring: "In scadenza entro 30 giorni",
  valid: "Validi",
  all: "Tutte",
}

export type CertFilterCounts = Record<CertListFilter, number>

export function certFilterCounts(statuses: CertStatus[]): CertFilterCounts {
  const counts: CertFilterCounts = {
    missing: 0,
    expired: 0,
    expiring: 0,
    valid: 0,
    all: statuses.length,
  }
  for (const status of statuses) counts[status] += 1
  return counts
}

export function parseCertListFilter(
  value: string | undefined,
): CertListFilter | null {
  return value && (CERT_FILTER_ORDER as string[]).includes(value)
    ? (value as CertListFilter)
    : null
}

/**
 * Il chip acceso quando l'URL non ne chiede uno: il primo non vuoto,
 * nell'ordine dei chip. Si apre sul lavoro da fare, non su un elenco vuoto.
 */
export function defaultCertFilter(counts: CertFilterCounts): CertListFilter {
  return (
    CERT_FILTER_ORDER.find((filter) => filter !== "all" && counts[filter] > 0) ??
    "all"
  )
}

export function matchesCertFilter(
  status: CertStatus,
  filter: CertListFilter,
): boolean {
  return filter === "all" || status === filter
}
