import Link from "next/link"
import { UserX, X } from "lucide-react"

import { GUARDIAN_GAP_FILTER } from "@/lib/athletes/guardian-gap"
import { ATHLETE_LIST_FILTERS } from "@/lib/athletes/list-filters"
import { statusTone, TONE_BADGE } from "@/lib/status/tone"
import { cn } from "@/lib/utils"

import type { AthleteListFilter } from "../queries"

type Props = {
  activeFilter: AthleteListFilter | null
  // Numero sul chip di ingresso, lo stesso del riquadro in dashboard
  withoutGuardianCount: number
  guardianHref: string
  offHref: string
}

const ACTIVE_LABEL: Record<AthleteListFilter, string> = {
  [GUARDIAN_GAP_FILTER]: "Minorenni senza genitore collegato",
  "senza-corso": "Senza corso quest'anno",
  "senza-email": "Maggiorenni senza email",
}

// Filtri dell'elenco allieve. Il chip di ingresso è uno solo — le minorenni
// senza genitore, che senza un elenco dedicato non si trovano — ma quando un
// filtro arriva dalla dashboard il chip dice quale è attivo e come toglierlo.
//
// Link e non bottoni: il filtro sta nell'URL, quindi resta condivisibile e
// sopravvive al refresh. È lo stesso indirizzo dei riquadri "Da fare".
export function AthletesFilterChip({
  activeFilter,
  withoutGuardianCount,
  guardianHref,
  offHref,
}: Props) {
  if (activeFilter) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium",
            // Rosso sulle minorenni senza genitore, ambra sugli altri due:
            // lo decide statusTone dal passo, come in dashboard
            TONE_BADGE[
              statusTone({
                kind: "setupStep",
                step: ATHLETE_LIST_FILTERS[activeFilter],
              })
            ],
          )}
        >
          <UserX className="h-3.5 w-3.5" />
          {ACTIVE_LABEL[activeFilter]}
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

  // Resta visibile anche a zero: è il posto dove si torna a controllare, e un
  // filtro che compare e sparisce non si impara
  return (
    <Link
      href={guardianHref}
      scroll={false}
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        withoutGuardianCount > 0
          ? TONE_BADGE[statusTone({ kind: "guardian", missing: true })]
          : "text-muted-foreground hover:bg-muted",
      )}
    >
      <UserX className="h-3.5 w-3.5" />
      Senza genitore collegato
      {withoutGuardianCount > 0 ? (
        <span className="font-semibold">({withoutGuardianCount})</span>
      ) : null}
    </Link>
  )
}
