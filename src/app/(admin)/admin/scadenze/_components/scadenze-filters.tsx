"use client"

import { useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatEuro } from "@/lib/utils/format"
import { cn } from "@/lib/utils"

import type {
  ScadenzeCount,
  ScadenzeSort,
  ScadenzeStatoFilter,
} from "../queries"

const ALL = "__all__"

// Etichette corte: a 1024 px quelle lunghe si troncavano a metà parola
const STATO_LABEL: Record<ScadenzeStatoFilter, string> = {
  DEFAULT: "Da sollecitare",
  IN_RITARDO: "In ritardo",
  IN_SCADENZA_7GG: "Entro 7 giorni",
  TUTTE: "Tutte",
}

// L'importo si mostra dove il denaro è il punto: quanto manca all'incasso
const STATO_WITH_AMOUNT: ScadenzeStatoFilter[] = ["DEFAULT", "IN_RITARDO"]

const SORT_LABEL: Record<ScadenzeSort, string> = {
  dueDate_asc: "Più vecchie prima",
  dueDate_desc: "Più recenti prima",
  amount_desc: "Importo più alto",
}

interface ScadenzeFiltersProps {
  stato: ScadenzeStatoFilter
  courseId?: string
  sortBy: ScadenzeSort
  courses: Array<{ id: string; name: string }>
  counts: ScadenzeCount[]
}

export function ScadenzeFilters({
  stato,
  courseId,
  sortBy,
  courses,
  counts,
}: ScadenzeFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === null || value === ALL) params.delete(key)
    else params.set(key, value)
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Chip e non tab: il numero accanto all'etichetta dice quanto lavoro
          c'è dietro ogni filtro, e l'importo quanto vale */}
      <div
        role="group"
        aria-label="Filtra le scadenze"
        className="flex flex-wrap gap-2"
      >
        {counts.map((entry) => {
          const active = entry.stato === stato
          const withAmount = STATO_WITH_AMOUNT.includes(entry.stato)
          return (
            <Button
              key={entry.stato}
              type="button"
              variant={active ? "default" : "outline"}
              aria-pressed={active}
              className={cn("h-11 gap-2 rounded-full px-4")}
              onClick={() =>
                updateParam(
                  "stato",
                  entry.stato === "DEFAULT" ? null : entry.stato,
                )
              }
            >
              <span>{STATO_LABEL[entry.stato]}</span>
              <span className="font-mono text-xs opacity-80">
                {entry.count}
                {withAmount && entry.amountCents > 0
                  ? ` · ${formatEuro(entry.amountCents)}`
                  : ""}
              </span>
            </Button>
          )
        })}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <Select
          value={courseId ?? ALL}
          onValueChange={(v) => updateParam("courseId", v)}
        >
          <SelectTrigger className="h-11 w-full sm:w-[180px]">
            <SelectValue placeholder="Corso" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tutti i corsi</SelectItem>
            {courses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* L'anno accademico sta accanto al titolo (YearSelector) */}
        <Select
          value={sortBy}
          onValueChange={(v) =>
            updateParam("sortBy", v === "dueDate_asc" ? null : v)
          }
        >
          <SelectTrigger className="h-11 w-full sm:w-[180px]">
            <SelectValue placeholder="Ordina" />
          </SelectTrigger>
          <SelectContent>
            {(
              Object.keys(SORT_LABEL) as ScadenzeSort[]
            ).map((value) => (
              <SelectItem key={value} value={value}>
                {SORT_LABEL[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
