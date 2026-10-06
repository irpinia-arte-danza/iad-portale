"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect } from "react"
import { Maximize2 } from "lucide-react"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useIsBelowLg } from "@/hooks/use-is-below-lg"

// ─────────────────────────────────────────────────────────────────────────
// Il pannello: la scheda allieva sopra la lista, da destra.
//
// Non ha uno stato "aperto": esiste finché l'indirizzo è quello della
// scheda e ci si è arrivati dalla lista. Chiuderlo (X, Esc, clic fuori)
// vuol dire tornare indietro nella cronologia, che è anche quello che fa il
// tasto Indietro del browser — così la lista dietro è esattamente com'era:
// filtri, scorrimento, selezioni. Non è stata smontata.
//
// "Apri la scheda intera" è un link vero (<a>, non <Link>): l'indirizzo è
// già questo, e solo una navigazione piena mostra la pagina al posto del
// pannello.
// ─────────────────────────────────────────────────────────────────────────

type Props = {
  title: string
  subtitle: string | undefined
  // Incassa e il menu ⋯, gli stessi dell'intestazione della pagina
  actions: React.ReactNode
  children: React.ReactNode
}

export function AthletePanelSheet({
  title,
  subtitle,
  actions,
  children,
}: Props) {
  const router = useRouter()
  // L'indirizzo della scheda com'è adesso, scheda scelta compresa (?tab=)
  const pathname = usePathname()
  const query = useSearchParams().toString()
  const fullPageHref = query ? `${pathname}?${query}` : pathname
  const belowLg = useIsBelowLg()

  // Sotto 1024 il pannello non ci sta. I nomi nelle liste lì portano già
  // alla pagina; ma se ci si arriva da un altro link della lista (la
  // ricerca, "Collega un genitore") o si stringe la finestra, si passa alla
  // pagina intera: l'indirizzo è lo stesso, basta ricaricarlo.
  useEffect(() => {
    if (belowLg) window.location.reload()
  }, [belowLg])

  if (belowLg) return null

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) router.back()
      }}
    >
      <SheetContent
        side="right"
        // data-panel accende la variante in-panel: le griglie a più colonne
        // della scheda tornano a una, come sotto 1024
        data-panel=""
        // Le larghezze vanno scritte con la stessa variante del componente
        // Sheet (data-[side=right]:…), altrimenti vince il suo max-w-sm
        // Scorre il corpo, non il pannello: intestazione e X restano ferme
        className="gap-0 overflow-hidden p-0 data-[side=right]:w-[640px] data-[side=right]:max-w-[calc(100vw-2rem)] data-[side=right]:sm:max-w-[640px]"
      >
        <SheetHeader className="shrink-0 gap-3 border-b p-4 pr-12">
          <div className="space-y-1">
            <SheetTitle className="text-xl">{title}</SheetTitle>
            <SheetDescription>
              {subtitle ?? "Scheda dell'allieva"}
            </SheetDescription>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            {actions}
            <a
              href={fullPageHref}
              className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              Apri la scheda intera
            </a>
          </div>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </SheetContent>
    </Sheet>
  )
}
