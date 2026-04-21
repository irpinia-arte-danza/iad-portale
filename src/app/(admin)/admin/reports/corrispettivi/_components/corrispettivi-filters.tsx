"use client"

import { useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { FeeType, PaymentMethod } from "@prisma/client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FEE_TYPE_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/schemas/payment"
import {
  endOfMonth,
  startOfMonth,
  toDateInputValue,
} from "@/lib/utils/format"

interface CorrispettiviFiltersProps {
  defaultFrom: string
  defaultTo: string
  defaultFeeType?: FeeType
  defaultMethod?: PaymentMethod
}

const FEE_TYPE_ORDER: FeeType[] = [
  "MONTHLY",
  "TRIMESTER",
  "ASSOCIATION",
  "STAGE",
  "SHOWCASE_1",
  "SHOWCASE_2",
  "COSTUME",
  "TRIAL_LESSON",
  "OTHER",
]

const METHOD_ORDER: PaymentMethod[] = [
  "TRANSFER",
  "CASH",
  "POS",
  "SUMUP_LINK",
  "OTHER",
]

const ALL = "__all__"

type Preset = "this-month" | "last-month" | "this-quarter" | "this-year"

function computePreset(preset: Preset): { from: Date; to: Date } {
  const now = new Date()
  switch (preset) {
    case "this-month":
      return { from: startOfMonth(now), to: endOfMonth(now) }
    case "last-month": {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      return { from: startOfMonth(prev), to: endOfMonth(prev) }
    }
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
  }
}

export function CorrispettiviFilters({
  defaultFrom,
  defaultTo,
  defaultFeeType,
  defaultMethod,
}: CorrispettiviFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  function pushWithParams(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(next)) {
      if (value === null || value === "" || value === ALL) {
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
    const { from, to } = computePreset("this-month")
    pushWithParams({
      from: toDateInputValue(from),
      to: toDateInputValue(to),
      feeType: null,
      method: null,
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
          onClick={() => applyPreset("last-month")}
        >
          Mese scorso
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
          Anno corrente
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

        <div className="space-y-1">
          <Label>Tipo quota</Label>
          <Select
            value={defaultFeeType ?? ALL}
            onValueChange={(value) =>
              pushWithParams({ feeType: value === ALL ? null : value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Tutti i tipi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tutti i tipi</SelectItem>
              {FEE_TYPE_ORDER.map((type) => (
                <SelectItem key={type} value={type}>
                  {FEE_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Metodo</Label>
          <Select
            value={defaultMethod ?? ALL}
            onValueChange={(value) =>
              pushWithParams({ method: value === ALL ? null : value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Tutti i metodi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tutti i metodi</SelectItem>
              {METHOD_ORDER.map((method) => (
                <SelectItem key={method} value={method}>
                  {PAYMENT_METHOD_LABELS[method]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
