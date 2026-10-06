"use client"

import { useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { GUARDIAN_GAP_FILTER } from "@/lib/athletes/guardian-gap"
import {
  ATHLETE_FILTER_LABELS,
  ATHLETE_SORT_LABELS,
  OVERDUE_FILTER,
  athleteSortParam,
  type AthleteListFilter,
  type AthleteListSort,
  type AthleteStatusFilter,
} from "@/lib/athletes/list-filters"
import { formatEuro } from "@/lib/utils/format"
import { cn } from "@/lib/utils"

import type { AthleteListCounts } from "../queries"

const ALL = "__all__"

// ─────────────────────────────────────────────────────────────────────────
// I filtri dell'elenco allieve, tutti nell'URL.
//
// Prima ce n'era uno solo ("Senza genitore collegato"): per sapere chi del
// corso Pre danza è senza certificato si scorrevano 58 righe. I chip portano
// il numero, che è quello delle righe che aprono — e senza filtro per corso
// è lo stesso dei riquadri in dashboard, perché il predicato è lo stesso.
//
// Nell'URL: l'indirizzo filtrato si manda a qualcuno, sopravvive al refresh
// e è dove arrivano i riquadri della dashboard.
// ─────────────────────────────────────────────────────────────────────────

type Chip = {
  // null = nessun filtro, cioè "Tutte"
  filter: AthleteListFilter | null
  label: string
  count: number
  // Solo sul ritardo: il numero da solo non dice quanto manca all'incasso
  amountCents?: number
}

interface AthletesFiltersProps {
  filter: AthleteListFilter | null
  stato: AthleteStatusFilter
  sort: AthleteListSort
  courseId?: string
  courses: Array<{ id: string; name: string }>
  counts: AthleteListCounts
}

export function AthletesFilters({
  filter,
  stato,
  sort,
  courseId,
  courses,
  counts,
}: AthletesFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  function updateParams(changes: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === ALL) params.delete(key)
      else params.set(key, value)
    }
    // Cambiare filtro riporta alla prima pagina: la quarta pagina di un
    // elenco più corto non esiste
    params.delete("page")
    const query = params.toString()
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname)
    })
  }

  const chips: Chip[] = [
    { filter: null, label: "Tutte", count: counts.tutte },
    {
      filter: "senza-certificato",
      label: ATHLETE_FILTER_LABELS["senza-certificato"],
      count: counts.certificate,
    },
    {
      filter: GUARDIAN_GAP_FILTER,
      label: ATHLETE_FILTER_LABELS[GUARDIAN_GAP_FILTER],
      count: counts.guardian,
    },
    {
      filter: OVERDUE_FILTER,
      label: ATHLETE_FILTER_LABELS[OVERDUE_FILTER],
      count: counts.overdue.count,
      amountCents: counts.overdue.amountCents,
    },
  ]

  // Un filtro che arriva da un riquadro della dashboard e non ha un chip
  // (senza corso, maggiorenni senza email) si mostra comunque: altrimenti
  // l'elenco sembra incompleto senza dire perché
  const extra =
    filter && !chips.some((chip) => chip.filter === filter) ? filter : null

  return (
    <div className="flex flex-col gap-3">
      <div
        role="group"
        aria-label="Filtra le allieve"
        className="flex flex-wrap gap-2"
      >
        {chips.map((chip) => {
          const active = chip.filter === filter
          return (
            <Button
              key={chip.filter ?? "tutte"}
              type="button"
              variant={active ? "default" : "outline"}
              aria-pressed={active}
              className="h-11 gap-2 rounded-full px-4"
              onClick={() => updateParams({ filtro: chip.filter })}
            >
              <span>{chip.label}</span>
              <span className="font-mono text-xs opacity-80">
                {chip.count}
                {chip.amountCents !== undefined && chip.amountCents > 0
                  ? ` · ${formatEuro(chip.amountCents)}`
                  : ""}
              </span>
            </Button>
          )
        })}
        {extra ? (
          <Button
            type="button"
            variant="default"
            aria-pressed
            className="h-11 gap-2 rounded-full px-4"
            onClick={() => updateParams({ filtro: null })}
          >
            <span>{ATHLETE_FILTER_LABELS[extra]}</span>
            <X className="h-3.5 w-3.5 opacity-80" />
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <Select
          value={courseId ?? ALL}
          onValueChange={(value) => updateParams({ corso: value })}
        >
          <SelectTrigger className="h-11 w-full sm:w-[200px]">
            <SelectValue placeholder="Corso" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tutti i corsi</SelectItem>
            {courses.map((course) => (
              <SelectItem key={course.id} value={course.id}>
                {course.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={sort}
          onValueChange={(value) =>
            updateParams({ sort: athleteSortParam(value as AthleteListSort) })
          }
        >
          <SelectTrigger className="h-11 w-full sm:w-[200px]">
            <SelectValue placeholder="Ordina" />
          </SelectTrigger>
          <SelectContent>
            {(
              Object.keys(ATHLETE_SORT_LABELS) as AthleteListSort[]
            ).map((value) => (
              <SelectItem key={value} value={value}>
                {ATHLETE_SORT_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Attive / Ritirate: due popolazioni, non una colonna "Stato" con
            "Attiva" scritto su ogni riga */}
        <div
          role="group"
          aria-label="Allieve da mostrare"
          className="inline-flex w-full rounded-lg border p-0.5 sm:w-auto"
        >
          {(
            [
              ["attive", "Attive"],
              ["ritirate", "Ritirate"],
            ] as const
          ).map(([value, label]) => {
            const active = stato === value
            return (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={active ? "secondary" : "ghost"}
                aria-pressed={active}
                className={cn("h-10 flex-1 px-4 sm:flex-none")}
                onClick={() =>
                  updateParams({ stato: value === "attive" ? null : value })
                }
              >
                {label}
              </Button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
