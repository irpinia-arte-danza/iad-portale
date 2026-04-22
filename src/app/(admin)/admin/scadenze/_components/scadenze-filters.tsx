"use client"

import { useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

import type {
  ScadenzeSort,
  ScadenzeStatoFilter,
} from "../queries"

const ALL = "__all__"

interface ScadenzeFiltersProps {
  stato: ScadenzeStatoFilter
  courseId?: string
  academicYearId?: string
  sortBy: ScadenzeSort
  courses: Array<{ id: string; name: string }>
  academicYears: Array<{ id: string; label: string; isCurrent: boolean }>
}

export function ScadenzeFilters({
  stato,
  courseId,
  academicYearId,
  sortBy,
  courses,
  academicYears,
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
      <Tabs
        value={stato}
        onValueChange={(v) => updateParam("stato", v === "DEFAULT" ? null : v)}
      >
        <TabsList>
          <TabsTrigger value="DEFAULT">In ritardo + 7gg</TabsTrigger>
          <TabsTrigger value="IN_RITARDO">Solo in ritardo</TabsTrigger>
          <TabsTrigger value="IN_SCADENZA_7GG">Solo 7gg</TabsTrigger>
          <TabsTrigger value="TUTTE">Tutte aperte</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <Select
          value={courseId ?? ALL}
          onValueChange={(v) => updateParam("courseId", v)}
        >
          <SelectTrigger className="w-full sm:w-[200px]">
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

        <Select
          value={academicYearId ?? ALL}
          onValueChange={(v) => updateParam("academicYearId", v)}
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Anno accademico" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tutti gli AY</SelectItem>
            {academicYears.map((ay) => (
              <SelectItem key={ay.id} value={ay.id}>
                {ay.label}
                {ay.isCurrent ? " (corrente)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={sortBy}
          onValueChange={(v) =>
            updateParam("sortBy", v === "dueDate_asc" ? null : v)
          }
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Ordina per" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dueDate_asc">
              Scadenza (più vecchie prima)
            </SelectItem>
            <SelectItem value="dueDate_desc">
              Scadenza (più recenti prima)
            </SelectItem>
            <SelectItem value="amount_desc">
              Importo (decrescente)
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
