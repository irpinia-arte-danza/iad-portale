"use client"

import { useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  PARENTS_FILTERS,
  PARENTS_FILTER_LABELS,
  type ParentsFilter,
  type ParentsFilterCounts,
} from "@/lib/parents/list-filters"

// ─────────────────────────────────────────────────────────────────────────
// I chip dell'elenco genitori: lo stato dell'accesso, col numero.
//
// Prima c'era solo il filtro che arrivava dalla dashboard. Qui ci sono
// tutti e tre gli stati su cui si lavora, e il numero è quello delle righe
// che apre (stessa fonte della colonna "Accesso" e del riquadro).
// ─────────────────────────────────────────────────────────────────────────

interface ParentsFiltersProps {
  filter: ParentsFilter | null
  counts: ParentsFilterCounts
}

export function ParentsFilters({ filter, counts }: ParentsFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  function setFilter(next: ParentsFilter | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (next) params.set("filtro", next)
    else params.delete("filtro")
    const query = params.toString()
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname)
    })
  }

  const chips: { filter: ParentsFilter | null; label: string; count: number }[] =
    [
      { filter: null, label: "Tutti", count: counts.tutti },
      ...(Object.keys(PARENTS_FILTERS) as ParentsFilter[]).map((key) => ({
        filter: key as ParentsFilter | null,
        label: PARENTS_FILTER_LABELS[key],
        count: counts[key],
      })),
    ]

  return (
    <div
      role="group"
      aria-label="Filtra i genitori per accesso"
      className="flex flex-wrap gap-2"
    >
      {chips.map((chip) => {
        const active = chip.filter === filter
        return (
          <Button
            key={chip.filter ?? "tutti"}
            type="button"
            variant={active ? "default" : "outline"}
            aria-pressed={active}
            className="h-11 gap-2 rounded-full px-4"
            onClick={() => setFilter(chip.filter)}
          >
            <span>{chip.label}</span>
            <span className="font-mono text-xs opacity-80">{chip.count}</span>
          </Button>
        )
      })}
    </div>
  )
}
