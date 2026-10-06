import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────
// Una pagina che non ha ancora niente dentro.
//
// Prima ogni pagina vuota faceva a modo suo: un riquadro tratteggiato con
// "Nessun insegnante trovato", un campo di ricerca sopra il nulla, e in
// fondo "0 insegnanti totali". Sembrava una ricerca andata male, non una
// pagina da cominciare.
//
// Qui la forma è una: l'icona, cosa manca, **cosa farà la pagina quando sarà
// piena** (non "non ci sono dati", che si vede già) e il tasto per
// cominciare. Niente bordo tratteggiato, niente ricerca, niente conteggi a
// zero: chi chiama li nasconde quando mostra questo.
//
// Non è lo stato "la ricerca non ha trovato niente": quello resta nella
// lista, perché lì i dati ci sono e manca solo la corrispondenza.
// ─────────────────────────────────────────────────────────────────────────

type EmptyStateProps = {
  icon: LucideIcon
  title: string
  // Una riga: cosa succede in questa pagina quando c'è qualcosa
  description: string
  // Il tasto principale, già pronto (di solito il dialog di creazione).
  // Senza, lo stato vuoto è solo un'informazione: nel Cestino non c'è
  // niente da creare.
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center gap-3 px-4 py-12 text-center",
        className,
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-6" aria-hidden />
      </span>
      <div className="space-y-1">
        <h2 className="text-base font-medium">{title}</h2>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  )
}
