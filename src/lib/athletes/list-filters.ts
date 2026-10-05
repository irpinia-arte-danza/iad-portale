import { GUARDIAN_GAP_FILTER } from "@/lib/athletes/guardian-gap"
import type { SetupStepId } from "@/lib/athletes/setup-checklist"

// ─────────────────────────────────────────────────────────────────────────
// I filtri dell'elenco allieve, uno per passo mancante della scheda.
//
// Qui perché li condividono tre posti: l'elenco (che filtra), il chip (che
// dice quale filtro è attivo) e i riquadri "Da fare" in dashboard (che ci
// portano). Un nome scritto a mano in uno dei tre porterebbe a un link che
// apre un elenco non filtrato, con un numero diverso da quello del riquadro.
// ─────────────────────────────────────────────────────────────────────────

export const ATHLETE_LIST_FILTERS = {
  [GUARDIAN_GAP_FILTER]: "guardian",
  "senza-corso": "course",
  "senza-email": "email",
} as const satisfies Record<string, SetupStepId>

export type AthleteListFilter = keyof typeof ATHLETE_LIST_FILTERS
export type AthleteListFilterStep =
  (typeof ATHLETE_LIST_FILTERS)[AthleteListFilter]

export function parseAthleteListFilter(
  value: string | undefined,
): AthleteListFilter | null {
  if (!value) return null
  return value in ATHLETE_LIST_FILTERS
    ? (value as AthleteListFilter)
    : null
}

// Mappa inversa ricavata, non riscritta
const FILTER_BY_STEP = Object.fromEntries(
  Object.entries(ATHLETE_LIST_FILTERS).map(([filter, step]) => [step, filter]),
) as Record<AthleteListFilterStep, AthleteListFilter>

export function athleteStepHref(step: AthleteListFilterStep): string {
  return `/admin/athletes?filtro=${FILTER_BY_STEP[step]}`
}
