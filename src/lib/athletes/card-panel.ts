import { LG_BREAKPOINT } from "@/hooks/use-is-below-lg"
import {
  DEFAULT_ATHLETE_TAB,
  type AthleteTabId,
} from "@/lib/athletes/athlete-tabs"

// ─────────────────────────────────────────────────────────────────────────
// La scheda allieva in pannello laterale, dalle liste.
//
// Da Scadenze e Certificati aprire una scheda voleva dire lasciare la lista
// e poi tornarci, perdendo filtri e posizione — e il gesto tipico è aprirne
// tre o quattro di seguito. Da 1024 px in su la scheda si apre in un
// pannello a destra, con la lista che resta dietro.
//
// L'indirizzo del pannello è quello della scheda: non esiste un "URL del
// pannello". È una intercepting route di Next: navigando dalla lista si
// vede il pannello, ricaricando (o arrivando da un link) si vede la pagina
// intera. Sotto 1024 il pannello non ci sta, e il nome porta alla pagina.
// ─────────────────────────────────────────────────────────────────────────

export const PANEL_MIN_WIDTH = LG_BREAKPOINT
export const PANEL_WIDTH_PX = 640

/** Pannello o pagina: lo decide la larghezza della finestra */
export function opensInPanel(viewportWidth: number): boolean {
  return viewportWidth >= PANEL_MIN_WIDTH
}

/** L'indirizzo della scheda: lo stesso per la pagina e per il pannello */
export function athleteCardHref(athleteId: string, tab?: AthleteTabId): string {
  const base = `/admin/athletes/${athleteId}`
  return tab && tab !== DEFAULT_ATHLETE_TAB ? `${base}?tab=${tab}` : base
}
