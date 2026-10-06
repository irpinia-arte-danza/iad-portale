// ─────────────────────────────────────────────────────────────────────────
// Le schede della scheda allieva, con il valore nell'URL.
//
// Serve a due cose: non far scorrere otto blocchi per arrivare ai contributi,
// e poter mandare qualcuno direttamente dove serve — la dashboard, un elenco
// o la ricerca aprono /admin/athletes/{id}?tab=contributi.
//
// Un valore sconosciuto non è un errore: si torna alla panoramica.
// ─────────────────────────────────────────────────────────────────────────

export const ATHLETE_TABS = [
  { id: "panoramica", label: "Panoramica" },
  { id: "contributi", label: "Contributi" },
  { id: "corsi", label: "Corsi" },
  { id: "documenti", label: "Documenti" },
  { id: "anagrafica", label: "Anagrafica e genitori" },
  { id: "email", label: "Email" },
] as const

export type AthleteTabId = (typeof ATHLETE_TABS)[number]["id"]

export const DEFAULT_ATHLETE_TAB: AthleteTabId = "panoramica"

export function parseAthleteTab(value: string | undefined): AthleteTabId {
  const found = ATHLETE_TABS.find((tab) => tab.id === value)
  return found ? found.id : DEFAULT_ATHLETE_TAB
}

export function athleteTabHref(athleteId: string, tab: AthleteTabId): string {
  return tab === DEFAULT_ATHLETE_TAB
    ? `/admin/athletes/${athleteId}`
    : `/admin/athletes/${athleteId}?tab=${tab}`
}
