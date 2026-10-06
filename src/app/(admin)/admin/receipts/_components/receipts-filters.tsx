"use client"

import { useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import { statusTone, TONE_BADGE } from "@/lib/status/tone"
import { cn } from "@/lib/utils"

import type { ReceiptDeliveryFilter } from "../queries"

const LABEL: Record<ReceiptDeliveryFilter, string> = {
  "da-consegnare": "Da consegnare",
  consegnate: "Consegnate",
  annullate: "Annullate",
  tutte: "Tutte",
}

const ORDER: ReceiptDeliveryFilter[] = [
  "da-consegnare",
  "consegnate",
  "annullate",
  "tutte",
]

interface ReceiptsFiltersProps {
  stato: ReceiptDeliveryFilter
  counts: Record<ReceiptDeliveryFilter, number>
}

export function ReceiptsFilters({
  stato,
  counts,
}: ReceiptsFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === null) params.delete(key)
    else params.set(key, value)
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {/* L'anno fiscale sta accanto al titolo (YearSelector): qui restano
          solo gli stati di consegna */}
      <div role="group" aria-label="Filtra le ricevute" className="flex flex-wrap gap-2">
        {ORDER.map((value) => {
          const active = value === stato
          return (
            <Button
              key={value}
              type="button"
              variant={active ? "default" : "outline"}
              aria-pressed={active}
              className={cn(
                "h-11 gap-2 rounded-full px-4",
                // Il lavoro in sospeso è ambra, come in Scadenze
                !active &&
                  value === "da-consegnare" &&
                  counts[value] > 0 &&
                  TONE_BADGE[statusTone({ kind: "receipt", toDeliver: true })],
              )}
              onClick={() => updateParam("stato", value)}
            >
              <span>{LABEL[value]}</span>
              <span className="font-mono text-xs opacity-80">
                {counts[value]}
              </span>
            </Button>
          )
        })}
      </div>
    </div>
  )
}
