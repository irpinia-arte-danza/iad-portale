import Link from "next/link"
import { UserX, X } from "lucide-react"

import { cn } from "@/lib/utils"

type Props = {
  active: boolean
  count: number
  // Link che attiva il filtro e link che lo toglie, costruiti dalla pagina
  // così conservano ricerca e ordinamento
  onHref: string
  offHref: string
}

// Filtro "senza genitore collegato" della lista allieve. Link e non bottone:
// il filtro sta nell'URL, così resta condivisibile e sopravvive al refresh —
// è lo stesso indirizzo a cui punta la riga della dashboard.
//
// Resta visibile anche a zero: è il posto dove si torna a controllare, e un
// filtro che compare e sparisce non si impara.
export function AthletesFilterChip({ active, count, onHref, offHref }: Props) {
  if (active) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-900 dark:text-amber-200">
          <UserX className="h-3.5 w-3.5" />
          Minorenni senza genitore collegato
        </span>
        <Link
          href={offHref}
          scroll={false}
          className="inline-flex min-h-11 items-center gap-1 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
          Togli il filtro
        </Link>
      </div>
    )
  }

  return (
    <Link
      href={onHref}
      scroll={false}
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        count > 0
          ? "border-amber-500/40 bg-amber-500/10 text-amber-900 hover:bg-amber-500/20 dark:text-amber-200"
          : "text-muted-foreground hover:bg-muted",
      )}
    >
      <UserX className="h-3.5 w-3.5" />
      Senza genitore collegato
      {count > 0 ? (
        <span className="font-semibold">({count})</span>
      ) : null}
    </Link>
  )
}
