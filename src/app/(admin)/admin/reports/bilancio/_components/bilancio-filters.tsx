"use client"

import { useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  endOfMonth,
  startOfMonth,
  toDateInputValue,
} from "@/lib/utils/format"

interface BilancioFiltersProps {
  defaultFrom: string
  defaultTo: string
}

type Preset = "this-month" | "this-quarter" | "this-year" | "this-ay"

function startOfAcademicYear(ref: Date = new Date()): Date {
  const y =
    ref.getMonth() >= 8 ? ref.getFullYear() : ref.getFullYear() - 1
  return new Date(y, 8, 1)
}

function endOfAcademicYear(ref: Date = new Date()): Date {
  const y =
    ref.getMonth() >= 8 ? ref.getFullYear() + 1 : ref.getFullYear()
  return new Date(y, 7, 31, 23, 59, 59, 999)
}

function computePreset(preset: Preset): { from: Date; to: Date } {
  const now = new Date()
  switch (preset) {
    case "this-month":
      return { from: startOfMonth(now), to: endOfMonth(now) }
    case "this-quarter": {
      const q = Math.floor(now.getMonth() / 3)
      const from = new Date(now.getFullYear(), q * 3, 1)
      const to = new Date(
        now.getFullYear(),
        q * 3 + 3,
        0,
        23,
        59,
        59,
        999,
      )
      return { from, to }
    }
    case "this-year":
      return {
        from: new Date(now.getFullYear(), 0, 1),
        to: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
      }
    case "this-ay":
      return { from: startOfAcademicYear(now), to: endOfAcademicYear(now) }
  }
}

export function BilancioFilters({
  defaultFrom,
  defaultTo,
}: BilancioFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  function pushWithParams(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(next)) {
      if (value === null || value === "") {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  function applyPreset(preset: Preset) {
    const { from, to } = computePreset(preset)
    pushWithParams({
      from: toDateInputValue(from),
      to: toDateInputValue(to),
    })
  }

  function resetFilters() {
    const { from, to } = computePreset("this-year")
    pushWithParams({
      from: toDateInputValue(from),
      to: toDateInputValue(to),
    })
  }

  function updateDate(key: "from" | "to", value: string) {
    if (!value) return
    pushWithParams({ [key]: value })
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => applyPreset("this-month")}
        >
          Questo mese
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => applyPreset("this-quarter")}
        >
          Trimestre corrente
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => applyPreset("this-year")}
        >
          Anno fiscale
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => applyPreset("this-ay")}
        >
          Anno accademico
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="from">Dal</Label>
          <Input
            id="from"
            type="date"
            value={defaultFrom}
            onChange={(e) => updateDate("from", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="to">Al</Label>
          <Input
            id="to"
            type="date"
            value={defaultTo}
            onChange={(e) => updateDate("to", e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={resetFilters}>
          Reset filtri
        </Button>
      </div>
    </div>
  )
}
