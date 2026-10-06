"use client"

import { useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  BILANCIO_PRESETS,
  bilancioPresetRange,
  matchBilancioPreset,
  type BilancioPreset,
} from "@/lib/bilancio/periods"

interface BilancioFiltersProps {
  from: string
  to: string
  // Il giorno di Roma, dalla pagina: il chip acceso è lo stesso sul server e
  // nel browser
  todayIso: string
}

// ─────────────────────────────────────────────────────────────────────────
// Il periodo del Bilancio: quattro chip su una riga.
//
// Le due date libere stanno dietro "Altro periodo": prima erano sempre a
// vista, sei controlli per una domanda che quasi sempre è "com'è andato
// quest'anno".
// ─────────────────────────────────────────────────────────────────────────
export function BilancioFilters({ from, to, todayIso }: BilancioFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const activePreset = matchBilancioPreset({ from, to }, todayIso)
  // "Altro periodo" è acceso quando l'intervallo non è uno dei tre, oppure
  // quando lo si è appena scelto per cambiare le date
  const [customOpen, setCustomOpen] = useState(false)
  const showCustom = customOpen || activePreset === null

  function push(next: { from: string; to: string }) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("from", next.from)
    params.set("to", next.to)
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  function applyPreset(preset: BilancioPreset) {
    setCustomOpen(false)
    push(bilancioPresetRange(preset, todayIso))
  }

  function updateDate(key: "from" | "to", value: string) {
    if (!value) return
    push({ from, to, [key]: value })
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        role="group"
        aria-label="Periodo del bilancio"
        className="flex flex-wrap gap-2"
      >
        {BILANCIO_PRESETS.map((preset) => {
          const active = !showCustom && activePreset === preset.key
          return (
            <Button
              key={preset.key}
              type="button"
              variant={active ? "default" : "outline"}
              aria-pressed={active}
              className="h-11 rounded-full px-4"
              onClick={() => applyPreset(preset.key)}
            >
              {preset.label}
            </Button>
          )
        })}
        <Button
          type="button"
          variant={showCustom ? "default" : "outline"}
          aria-pressed={showCustom}
          aria-expanded={showCustom}
          className="h-11 rounded-full px-4"
          onClick={() => setCustomOpen(true)}
        >
          Altro periodo
        </Button>
      </div>

      {showCustom ? (
        <div className="grid gap-3 rounded-lg border bg-card p-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="bilancio-from">Dal</Label>
            <Input
              id="bilancio-from"
              type="date"
              className="h-11"
              value={from}
              max={to}
              onChange={(e) => updateDate("from", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="bilancio-to">Al</Label>
            <Input
              id="bilancio-to"
              type="date"
              className="h-11"
              value={to}
              min={from}
              onChange={(e) => updateDate("to", e.target.value)}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
