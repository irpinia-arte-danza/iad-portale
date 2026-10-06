import type { AccessStatus } from "@/lib/auth/access-status-types"

// ─────────────────────────────────────────────────────────────────────────
// I filtri dell'elenco genitori: lo stato dell'accesso all'area riservata.
//
// Nell'URL, come quelli delle allieve. "senza-accesso" è il valore che usa
// già il riquadro "Genitori senza accesso" della dashboard (#42): resta
// valido, ed è il chip "Mai invitati".
//
// Lo stato non è una colonna: lo ricava getAccessStatuses da auth.users e
// dallo storico delle email. Per questo qui si filtra e si conta sugli
// stati già calcolati — la stessa fonte del riquadro e della colonna
// "Accesso", così i tre posti non possono dire numeri diversi.
// ─────────────────────────────────────────────────────────────────────────

export const PARENTS_WITHOUT_ACCESS_FILTER = "senza-accesso"

export const PARENTS_FILTERS = {
  [PARENTS_WITHOUT_ACCESS_FILTER]: "NEVER_INVITED",
  invitati: "INVITED",
  "con-accesso": "ACTIVE",
} as const satisfies Record<string, AccessStatus["kind"]>

export type ParentsFilter = keyof typeof PARENTS_FILTERS

export const PARENTS_FILTER_LABELS: Record<ParentsFilter, string> = {
  [PARENTS_WITHOUT_ACCESS_FILTER]: "Mai invitati",
  invitati: "Invitati, in attesa",
  "con-accesso": "Con accesso",
}

export function parseParentsFilter(
  value: string | undefined,
): ParentsFilter | null {
  return value && value in PARENTS_FILTERS ? (value as ParentsFilter) : null
}

const NO_EMAIL: AccessStatus = { kind: "NO_EMAIL" }

export function matchesParentsFilter(
  status: AccessStatus | undefined,
  filter: ParentsFilter,
): boolean {
  return (status ?? NO_EMAIL).kind === PARENTS_FILTERS[filter]
}

export type ParentsFilterCounts = Record<ParentsFilter, number> & {
  tutti: number
}

// "Tutti" è più della somma dei tre: chi è senza email non è né invitato né
// invitabile, e sta solo lì
export function parentsFilterCounts(
  ids: string[],
  statuses: Record<string, AccessStatus>,
): ParentsFilterCounts {
  const counts: ParentsFilterCounts = {
    tutti: ids.length,
    [PARENTS_WITHOUT_ACCESS_FILTER]: 0,
    invitati: 0,
    "con-accesso": 0,
  }
  for (const id of ids) {
    for (const filter of Object.keys(PARENTS_FILTERS) as ParentsFilter[]) {
      if (matchesParentsFilter(statuses[id], filter)) counts[filter] += 1
    }
  }
  return counts
}
