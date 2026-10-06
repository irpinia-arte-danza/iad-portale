"use client"

import Link from "next/link"

import { athleteCardHref, opensInPanel } from "@/lib/athletes/card-panel"
import type { AthleteTabId } from "@/lib/athletes/athlete-tabs"

// ─────────────────────────────────────────────────────────────────────────
// Il nome di un'allieva in una lista che apre la scheda in pannello.
//
// È un link normale alla scheda: da 1024 px in su la intercepting route
// della lista lo mostra nel pannello laterale. Sotto 1024 il pannello non
// ci sta, e l'unico modo di saltare l'intercettazione è una navigazione
// piena: il clic carica la pagina della scheda, come prima che il pannello
// esistesse.
//
// Fuori da Scadenze e Certificati è un link come gli altri: senza la route
// che intercetta, porta alla pagina.
// ─────────────────────────────────────────────────────────────────────────

type Props = {
  athleteId: string
  // La scheda su cui aprire (es. "documenti" dall'elenco Certificati)
  tab?: AthleteTabId
  className?: string
  children: React.ReactNode
}

export function AthleteCardLink({ athleteId, tab, className, children }: Props) {
  const href = athleteCardHref(athleteId, tab)

  return (
    <Link
      href={href}
      className={className}
      // La lista dietro non deve scorrere quando si apre il pannello
      scroll={false}
      onClick={(event) => {
        // Nuova scheda, nuova finestra: lascia fare al browser
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
          return
        }
        if (!opensInPanel(window.innerWidth)) {
          event.preventDefault()
          window.location.assign(href)
        }
      }}
    >
      {children}
    </Link>
  )
}
