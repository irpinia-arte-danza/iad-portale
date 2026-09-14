"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Search, X } from "lucide-react"
import type { ReceiptStatus } from "@prisma/client"

import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ReceiptsFiltersProps {
  years: number[]
  year: number
  status?: ReceiptStatus
  search: string
}

const ALL = "__all__"

export function ReceiptsFilters({ years, year, status, search }: ReceiptsFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const [value, setValue] = useState(search)
  const isMounted = useRef(false)

  function pushParams(params: URLSearchParams) {
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  function updateParam(key: string, next: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (next === null || next === ALL) params.delete(key)
    else params.set(key, next)
    pushParams(params)
  }

  // Ricerca con debounce (stesso schema della ricerca pagamenti)
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true
      return
    }
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      const trimmed = value.trim()
      if (trimmed === (params.get("search") ?? "")) return
      if (trimmed) params.set("search", trimmed)
      else params.delete("search")
      pushParams(params)
    }, 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative w-full sm:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Cerca per numero, allieva o pagante…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="pl-9 pr-9"
        />
        {value && (
          <button
            type="button"
            aria-label="Cancella ricerca"
            onClick={() => setValue("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Select
          value={String(year)}
          onValueChange={(next) => updateParam("year", next)}
        >
          <SelectTrigger className="sm:w-32" aria-label="Anno di emissione">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={status ?? ALL}
          onValueChange={(next) => updateParam("status", next)}
        >
          <SelectTrigger className="sm:w-40" aria-label="Stato ricevuta">
            <SelectValue placeholder="Tutte" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tutte</SelectItem>
            <SelectItem value="VALID">Valide</SelectItem>
            <SelectItem value="CANCELLED">Annullate</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
