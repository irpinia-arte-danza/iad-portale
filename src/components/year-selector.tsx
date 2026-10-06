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
import { calendarYearRange } from "@/lib/years/year-context"

// ─────────────────────────────────────────────────────────────────────────
// L'anno di una pagina, accanto al titolo.
//
// Un "2026" in mezzo ai filtri non diceva di quale calendario fosse. Qui
// l'etichetta è parte del controllo — "AA 2026-2027" o "Anno fiscale 2026" —
// e sta dove si legge il titolo, perché cambia tutto quello che c'è sotto.
//
// Si usa solo dove la pagina sa già cambiare anno: non crea filtri nuovi,
// scrive nell'URL il parametro che la pagina legge già.
// ─────────────────────────────────────────────────────────────────────────

export type YearOption = { value: string; label: string }

type Props = {
  kind: "academic" | "fiscal"
  // null quando il periodo scelto non sta in un anno solo (Bilancio a
  // cavallo di due anni)
  value: string | null
  options: YearOption[]
  // Come si scrive la scelta nell'URL:
  // - "param": un parametro solo (es. ?year=2025, ?academicYearId=…)
  // - "calendar-range": ?from=2025-01-01&to=2025-12-31, per le pagine che
  //   ragionano per periodo
  apply: { mode: "param"; name: string } | { mode: "calendar-range" }
  // Il valore dell'anno corrente: sceglierlo toglie il parametro, così
  // l'indirizzo "pulito" resta quello dell'anno in corso
  currentValue: string | null
}

const PREFIX = { academic: "AA", fiscal: "Anno fiscale" } as const

export function YearSelector({
  kind,
  value,
  options,
  apply,
  currentValue,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  function choose(next: string) {
    const params = new URLSearchParams(searchParams.toString())
    // Cambiare anno riporta alla prima pagina
    params.delete("page")

    if (apply.mode === "param") {
      if (next === currentValue) params.delete(apply.name)
      else params.set(apply.name, next)
    } else if (next === currentValue) {
      params.delete("from")
      params.delete("to")
    } else {
      const range = calendarYearRange(Number(next))
      params.set("from", range.from)
      params.set("to", range.to)
    }

    const query = params.toString()
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname)
    })
  }

  const selected = options.find((option) => option.value === value)

  return (
    <Select value={value ?? ""} onValueChange={choose}>
      <SelectTrigger
        className="h-11 w-auto gap-2 font-mono text-sm"
        aria-label={kind === "academic" ? "Anno accademico" : "Anno fiscale"}
      >
        <span className="font-sans text-muted-foreground">{PREFIX[kind]}</span>
        <SelectValue placeholder="più anni">
          {selected?.label ?? "più anni"}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className="font-mono"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
