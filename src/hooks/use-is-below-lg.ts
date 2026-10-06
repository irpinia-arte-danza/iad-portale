import * as React from "react"

// ─────────────────────────────────────────────────────────────────────────
// Sotto i 1024 px la barra laterale non ci sta.
//
// La Sidebar di shadcn passa a Sheet con useIsMobile, che è a 768: fra 768 e
// 1023 px restava quindi fissa a 250 px e al contenuto ne avanzavano ~500.
// Su iPad verticale (820 px) in Allieve sparivano "Aggiungi allieva" e il
// filtro, in Scadenze le colonne di destra. La variante a icone non aiutava:
// venti icone senza etichetta.
//
// Soglia a parte, e usata solo dalla Sidebar: useIsMobile resta a 768 per
// tabelle, dialog e tutto il resto, dove quella soglia è giusta.
// ─────────────────────────────────────────────────────────────────────────

export const LG_BREAKPOINT = 1024

export function isBelowLg(width: number): boolean {
  return width < LG_BREAKPOINT
}

const QUERY = `(max-width: ${LG_BREAKPOINT - 1}px)`

function subscribe(onChange: () => void): () => void {
  const mql = window.matchMedia(QUERY)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}

function getSnapshot(): boolean {
  return isBelowLg(window.innerWidth)
}

// Sul server non c'è una larghezza: si parte da "sopra lg" e il primo render
// nel browser corregge. Non si vede un lampo perché la barra fissa è
// comunque nascosta da CSS (`hidden lg:block`) e il Sheet parte chiuso.
function getServerSnapshot(): boolean {
  return false
}

export function useIsBelowLg(): boolean {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
