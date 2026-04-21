"use client"

import { useMemo, useState, useTransition } from "react"
import { FolderArchive, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface AnnualExportYearOption {
  year: number
  isCurrent: boolean
  isClosed: boolean
  hasData: boolean
}

interface AnnualExportFormProps {
  years: AnnualExportYearOption[]
}

export function AnnualExportForm({ years }: AnnualExportFormProps) {
  const defaultYear = useMemo(() => {
    const current = years.find((y) => y.isCurrent)
    if (current) return String(current.year)
    const first = years.find((y) => y.hasData) ?? years[0]
    return first ? String(first.year) : ""
  }, [years])

  const [selected, setSelected] = useState<string>(defaultYear)
  const [isPending, startTransition] = useTransition()

  const selectedEntry = years.find((y) => String(y.year) === selected)

  function runDownload() {
    if (!selected) {
      toast.error("Seleziona un anno fiscale")
      return
    }
    startTransition(async () => {
      try {
        const res = await fetch(`/api/reports/annual/${selected}/download`, {
          method: "GET",
          cache: "no-store",
        })
        if (!res.ok) {
          const body = await res.json().catch(() => null)
          const message =
            body && typeof body.error === "string"
              ? body.error
              : `Errore ${res.status}`
          toast.error(message)
          return
        }

        const blob = await res.blob()
        const disposition = res.headers.get("Content-Disposition") ?? ""
        const match = disposition.match(/filename="?([^"]+)"?/)
        const filename = match?.[1] ?? `IAD_Export_Annuale_${selected}.zip`

        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        toast.success(`Export ${selected} scaricato`)
      } catch {
        console.error("[annual export] download failed", { selected })
        toast.error("Errore imprevisto durante il download")
      }
    })
  }

  if (years.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        Nessun anno fiscale configurato. Crea un FiscalYear nelle
        impostazioni per abilitare l&apos;export.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="space-y-1">
          <Label htmlFor="year">Anno fiscale</Label>
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger id="year">
              <SelectValue placeholder="Seleziona anno" />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => {
                const labels: string[] = []
                if (y.isCurrent) labels.push("corrente")
                if (y.isClosed) labels.push("chiuso")
                if (!y.hasData) labels.push("vuoto")
                const suffix = labels.length > 0 ? ` · ${labels.join(" · ")}` : ""
                return (
                  <SelectItem key={y.year} value={String(y.year)}>
                    {y.year}
                    {suffix}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>

        <Button
          type="button"
          onClick={runDownload}
          disabled={isPending || !selected}
          size="lg"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FolderArchive className="h-4 w-4" />
          )}
          Scarica ZIP
        </Button>
      </div>

      {selectedEntry && !selectedEntry.hasData ? (
        <p className="text-xs text-muted-foreground">
          Nessun movimento registrato per l&apos;anno {selectedEntry.year}.
          Lo ZIP conterrà comunque i tre file con soli totali a zero.
        </p>
      ) : null}

      <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Contenuto ZIP:</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          <li>
            <span className="font-mono">01_Corrispettivi_{selected || "{year}"}.xlsx</span>{" "}
            — registro entrate con subtotali
          </li>
          <li>
            <span className="font-mono">02_Spese_{selected || "{year}"}.xlsx</span>{" "}
            — registro uscite con subtotali
          </li>
          <li>
            <span className="font-mono">03_Bilancio_{selected || "{year}"}.pdf</span>{" "}
            — sintesi KPI + entrate e uscite per tipologia
          </li>
        </ul>
      </div>
    </div>
  )
}
