import { GUARDIAN_GAP_FILTER } from "@/lib/athletes/guardian-gap"
import type { SetupStepId } from "@/lib/athletes/setup-checklist"

// ─────────────────────────────────────────────────────────────────────────
// Filtri e ordinamenti dell'elenco allieve, tutti nell'URL.
//
// Qui perché li condividono quattro posti: l'elenco (che filtra), i chip
// (che dicono quale filtro è attivo e quante righe apre), i riquadri "Da
// fare" della dashboard (che ci portano) e il menu. Un nome scritto a mano
// in uno dei quattro porterebbe a un link che apre un elenco non filtrato,
// con un numero diverso da quello del riquadro.
//
// Nell'URL perché un filtro che vive nello stato di un componente non si può
// mandare a nessuno, non sopravvive al refresh e non è raggiungibile da un
// riquadro della dashboard.
// ─────────────────────────────────────────────────────────────────────────

// Filtri che sono un passo mancante della scheda: li decide
// athleteSetupChecklist, cioè la stessa funzione che conta i riquadri
export const ATHLETE_STEP_FILTERS = {
  [GUARDIAN_GAP_FILTER]: "guardian",
  "senza-corso": "course",
  "senza-email": "email",
  "senza-certificato": "certificate",
  "senza-privacy": "privacy",
} as const satisfies Record<string, SetupStepId>

// Il filtro che non è un passo dell'anagrafica: viene dalle rate, con lo
// stesso predicato dell'elenco Scadenze (scadenzeWhere IN_RITARDO)
export const OVERDUE_FILTER = "in-ritardo"

export type AthleteStepFilter = keyof typeof ATHLETE_STEP_FILTERS
export type AthleteListFilter = AthleteStepFilter | typeof OVERDUE_FILTER
export type AthleteListFilterStep =
  (typeof ATHLETE_STEP_FILTERS)[AthleteStepFilter]

export function isStepFilter(
  filter: AthleteListFilter,
): filter is AthleteStepFilter {
  return filter !== OVERDUE_FILTER
}

export function parseAthleteListFilter(
  value: string | undefined,
): AthleteListFilter | null {
  if (!value) return null
  if (value === OVERDUE_FILTER) return OVERDUE_FILTER
  return value in ATHLETE_STEP_FILTERS ? (value as AthleteStepFilter) : null
}

// Mappa inversa ricavata, non riscritta
const FILTER_BY_STEP = Object.fromEntries(
  Object.entries(ATHLETE_STEP_FILTERS).map(([filter, step]) => [step, filter]),
) as Record<AthleteListFilterStep, AthleteStepFilter>

export function athleteStepHref(step: AthleteListFilterStep): string {
  return `/admin/athletes?filtro=${FILTER_BY_STEP[step]}`
}

// Etichette dei filtri: i chip ne mostrano quattro, ma i riquadri della
// dashboard portano anche agli altri due, e un filtro attivo senza nome
// scritto da nessuna parte è un elenco che sembra incompleto
export const ATHLETE_FILTER_LABELS: Record<AthleteListFilter, string> = {
  [GUARDIAN_GAP_FILTER]: "Senza genitore",
  "senza-corso": "Senza corso quest'anno",
  "senza-email": "Maggiorenni senza email",
  "senza-certificato": "Senza certificato",
  "senza-privacy": "Senza consenso privacy",
  [OVERDUE_FILTER]: "In ritardo",
}

// ── Attive / Ritirate ────────────────────────────────────────────────────
// Due popolazioni separate e non una colonna "Stato" con "Attiva" su ogni
// riga: chi ha smesso si guarda a parte, e di default non si guarda.
export const ATHLETE_STATUS_FILTERS = ["attive", "ritirate"] as const
export type AthleteStatusFilter = (typeof ATHLETE_STATUS_FILTERS)[number]

export function parseAthleteStatusFilter(
  value: string | undefined,
): AthleteStatusFilter {
  return value === "ritirate" ? "ritirate" : "attive"
}

// ── Ordinamento ──────────────────────────────────────────────────────────
export type AthleteListSort = "name" | "certificate" | "card" | "overdue"

// Valore nell'URL. Il cognome è il default e non si scrive: un elenco
// ordinato per cognome è l'elenco normale.
const SORT_PARAM: Record<AthleteListSort, string | null> = {
  name: null,
  certificate: "certificato",
  card: "tessera",
  overdue: "ritardo",
}

const SORT_BY_PARAM = Object.fromEntries(
  Object.entries(SORT_PARAM).flatMap(([sort, param]) =>
    param === null ? [] : [[param, sort]],
  ),
) as Record<string, AthleteListSort>

export function parseAthleteListSort(
  value: string | undefined,
): AthleteListSort {
  return value && value in SORT_BY_PARAM ? SORT_BY_PARAM[value] : "name"
}

export function athleteSortParam(sort: AthleteListSort): string | null {
  return SORT_PARAM[sort]
}

// Etichette corte: nella select stanno su una riga anche su iPad
export const ATHLETE_SORT_LABELS: Record<AthleteListSort, string> = {
  name: "Cognome",
  certificate: "Scadenza certificato",
  card: "Scadenza tessera",
  overdue: "Ritardo",
}
