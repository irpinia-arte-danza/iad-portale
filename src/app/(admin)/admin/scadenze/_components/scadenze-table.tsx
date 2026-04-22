"use client"

import Link from "next/link"
import { useMemo, useState, useTransition } from "react"
import {
  Download,
  Mail,
  MoreHorizontal,
  Receipt,
  UserCircle,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { formatDateShort, formatEur } from "@/lib/utils/format"
import { generateCSV } from "@/lib/utils/csv"

import { getScadenzeCSVData } from "../actions"
import type { ScadenzaWithDetails } from "../queries"

interface ScadenzeTableProps {
  scadenze: ScadenzaWithDetails[]
}

const DISABLED_TOOLTIP = "Disponibile prossima sessione (Fase 5)"

function csvFilename() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `scadenze-aperte_${y}-${m}-${d}.csv`
}

function ScadenzaStatusBadge({ giorniRitardo }: { giorniRitardo: number }) {
  if (giorniRitardo > 0) {
    return (
      <Badge variant="destructive">
        scaduta da {giorniRitardo} {giorniRitardo === 1 ? "giorno" : "giorni"}
      </Badge>
    )
  }
  if (giorniRitardo === 0) {
    return (
      <Badge className="bg-amber-500 hover:bg-amber-500">oggi</Badge>
    )
  }
  const abs = Math.abs(giorniRitardo)
  return (
    <Badge variant="outline" className="border-amber-500/50 text-amber-700 dark:text-amber-500">
      tra {abs} {abs === 1 ? "giorno" : "giorni"}
    </Badge>
  )
}

export function ScadenzeTable({ scadenze }: ScadenzeTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isExporting, startExportTransition] = useTransition()

  const selectableIds = useMemo(
    () => scadenze.map((s) => s.id),
    [scadenze],
  )

  const selectedTotal = useMemo(() => {
    let total = 0
    for (const s of scadenze) {
      if (selected.has(s.id)) total += s.amountCents
    }
    return total
  }, [selected, scadenze])

  const allChecked =
    scadenze.length > 0 && selected.size === scadenze.length
  const someChecked = selected.size > 0 && !allChecked
  const headerChecked: boolean | "indeterminate" = allChecked
    ? true
    : someChecked
      ? "indeterminate"
      : false

  function toggleAll(checked: boolean | "indeterminate") {
    if (checked === true) {
      setSelected(new Set(selectableIds))
    } else {
      setSelected(new Set())
    }
  }

  function toggleOne(id: string, checked: boolean | "indeterminate") {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked === true) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function clearSelection() {
    setSelected(new Set())
  }

  function exportCsv(ids: string[]) {
    startExportTransition(async () => {
      try {
        const { headers, rows } = await getScadenzeCSVData(ids)
        if (headers.length === 0) {
          toast.error("Nessun dato da esportare")
          return
        }
        generateCSV(headers, rows, csvFilename())
        toast.success(
          `Esportate ${rows.length} ${rows.length === 1 ? "scadenza" : "scadenze"}`,
        )
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Export fallito",
        )
      }
    })
  }

  if (scadenze.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <div className="text-4xl">✨</div>
        <h3 className="mt-3 text-base font-medium">Nessuna scadenza aperta</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Nessuna quota corrisponde ai filtri selezionati.
        </p>
      </div>
    )
  }

  const selectedIds = Array.from(selected)

  return (
    <>
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportCsv(selectableIds)}
          disabled={isExporting}
        >
          <Download className="h-4 w-4" />
          Esporta tutto ({scadenze.length})
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[44px]">
                <Checkbox
                  checked={headerChecked}
                  onCheckedChange={toggleAll}
                  aria-label="Seleziona tutte"
                />
              </TableHead>
              <TableHead>Allieva</TableHead>
              <TableHead className="hidden md:table-cell">Genitore</TableHead>
              <TableHead className="hidden lg:table-cell">Telefono</TableHead>
              <TableHead className="hidden sm:table-cell">Corso</TableHead>
              <TableHead className="text-right">Importo</TableHead>
              <TableHead>Scadenza</TableHead>
              <TableHead className="hidden lg:table-cell">
                Ultimo sollecito
              </TableHead>
              <TableHead className="hidden xl:table-cell text-right">
                Email
              </TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {scadenze.map((s) => {
              const isSelected = selected.has(s.id)
              const parentName = s.parent
                ? `${s.parent.lastName} ${s.parent.firstName}`
                : null
              return (
                <TableRow
                  key={s.id}
                  data-state={isSelected ? "selected" : undefined}
                >
                  <TableCell>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(c) => toggleOne(s.id, c)}
                      aria-label={`Seleziona scadenza ${s.athlete.lastName}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/athletes/${s.athlete.id}`}
                      className="font-medium hover:underline"
                    >
                      {s.athlete.lastName} {s.athlete.firstName}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {parentName ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm">{parentName}</span>
                        {s.parent?.email ? (
                          <span className="text-xs text-muted-foreground">
                            {s.parent.email}
                          </span>
                        ) : (
                          <span className="text-xs text-amber-600 dark:text-amber-500">
                            Email mancante
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {s.parent?.phone ? (
                      <a
                        href={`tel:${s.parent.phone}`}
                        className="font-mono text-xs hover:underline"
                      >
                        {s.parent.phone}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {s.course ? (
                      <Badge variant="secondary">{s.course.name}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatEur(s.amountCents)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="font-mono text-xs">
                        {formatDateShort(s.dueDate)}
                      </span>
                      <ScadenzaStatusBadge giorniRitardo={s.giorniRitardo} />
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {s.ultimoSollecito
                      ? formatDateShort(s.ultimoSollecito)
                      : "Mai"}
                  </TableCell>
                  <TableCell className="hidden xl:table-cell text-right">
                    {s.emailCount > 0 ? (
                      <Badge variant="outline">{s.emailCount}</Badge>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Azioni"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <DropdownMenuItem disabled>
                                <Mail className="h-4 w-4" />
                                Invia sollecito ora
                              </DropdownMenuItem>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="left">
                            {DISABLED_TOOLTIP}
                          </TooltipContent>
                        </Tooltip>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/athletes/${s.athlete.id}`}>
                            <UserCircle className="h-4 w-4" />
                            Apri scheda allieva
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/admin/payments">
                            <Receipt className="h-4 w-4" />
                            Vai ai pagamenti
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {selected.size > 0 && (
        <div className="sticky bottom-4 z-10 mx-auto flex w-full max-w-3xl items-center justify-between gap-3 rounded-lg border bg-background/95 p-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">
              {selected.size}{" "}
              {selected.size === 1 ? "scadenza" : "scadenze"} selezionate
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {formatEur(selectedTotal)} totale
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button variant="default" size="sm" disabled>
                    <Mail className="h-4 w-4" />
                    Invia sollecito
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>{DISABLED_TOOLTIP}</TooltipContent>
            </Tooltip>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportCsv(selectedIds)}
              disabled={isExporting}
            >
              <Download className="h-4 w-4" />
              Esporta CSV
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              aria-label="Deseleziona tutti"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
