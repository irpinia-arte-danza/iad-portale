"use client"

import { useMemo, useState, useTransition } from "react"
import { Download, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useOpenScheduleSettle } from "@/app/(admin)/admin/athletes/_components/schedule-settle-provider"
import { ScheduleAmountDialog } from "@/app/(admin)/admin/athletes/_components/schedule-amount-dialog"
import { countPayers, selectionLabel } from "@/lib/scadenze/payer-grouping"
import { formatEur } from "@/lib/utils/format"
import { generateCSV } from "@/lib/utils/csv"

import { getScadenzeCSVData } from "../actions"
import type { ScadenzaWithDetails } from "../queries"
import { ScadenzaRow } from "./scadenza-row"
import { SendReminderDialog } from "./send-reminder-dialog"

interface ScadenzeListProps {
  scadenze: ScadenzaWithDetails[]
}

function csvFilename() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `scadenze-aperte_${y}-${m}-${d}.csv`
}

// Chiave della famiglia, come la usa il sollecito di gruppo
function payerItems(rows: ScadenzaWithDetails[]) {
  return rows.map((s) => ({
    scheduleId: s.id,
    parentId: s.contact?.parentId ?? null,
    athleteId: s.athlete.id,
  }))
}

export function ScadenzeList({ scadenze }: ScadenzeListProps) {
  const openSettle = useOpenScheduleSettle()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isExporting, startExportTransition] = useTransition()
  const [reminderIds, setReminderIds] = useState<string[]>([])
  const [reminderOpen, setReminderOpen] = useState(false)
  // Un dialog solo per tutta la lista, non uno per riga (§17.38)
  const [amountTarget, setAmountTarget] = useState<ScadenzaWithDetails | null>(
    null,
  )

  const allIds = useMemo(() => scadenze.map((s) => s.id), [scadenze])
  const selectedRows = useMemo(
    () => scadenze.filter((s) => selected.has(s.id)),
    [scadenze, selected],
  )
  const selectedTotal = selectedRows.reduce((sum, s) => sum + s.amountCents, 0)
  const selectedFamilies = countPayers(payerItems(selectedRows))

  const allChecked = scadenze.length > 0 && selected.size === scadenze.length
  const headerChecked: boolean | "indeterminate" = allChecked
    ? true
    : selected.size > 0
      ? "indeterminate"
      : false

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function openReminderFor(ids: string[]) {
    if (ids.length === 0) return
    setReminderIds(ids)
    setReminderOpen(true)
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
        toast.error(err instanceof Error ? err.message : "Export fallito")
      }
    })
  }

  if (scadenze.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <div className="text-4xl">✨</div>
        <h3 className="mt-3 text-base font-medium">Nessuna scadenza aperta</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Nessun contributo corrisponde ai filtri selezionati.
        </p>
      </div>
    )
  }

  // Il sollecito di gruppo è per famiglia: il numero nel tasto è quello delle
  // email che partiranno davvero
  const reminderRows = scadenze.filter((s) => reminderIds.includes(s.id))
  const reminderFamilies = countPayers(payerItems(reminderRows))

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <Checkbox
            checked={headerChecked}
            onCheckedChange={(c) =>
              setSelected(c === true ? new Set(allIds) : new Set())
            }
            aria-label="Seleziona tutte"
            className="size-5"
          />
          Seleziona tutte ({scadenze.length})
        </label>
        <Button
          variant="outline"
          size="sm"
          className="h-11"
          onClick={() => exportCsv(allIds)}
          disabled={isExporting}
        >
          <Download className="h-4 w-4" />
          Esporta tutto
        </Button>
      </div>

      <ul className="rounded-md border">
        {scadenze.map((s) => (
          <ScadenzaRow
            key={s.id}
            scadenza={s}
            selected={selected.has(s.id)}
            onSelectedChange={(checked) => toggleOne(s.id, checked)}
            onSollecita={() => openReminderFor([s.id])}
            onEditAmount={() => setAmountTarget(s)}
            onIncassa={() =>
              openSettle({
                id: s.id,
                feeType: s.feeType,
                courseEnrollmentId: s.courseEnrollmentId,
                courseName:
                  s.course?.name ?? s.notes ?? "Contributo di iscrizione",
                dueDate: s.dueDate,
                amountCents: s.amountCents,
                athlete: s.athlete,
                defaultMethod: s.lastMethod,
              })
            }
          />
        ))}
      </ul>

      {selected.size > 0 && (
        <div className="sticky bottom-4 z-10 mx-auto flex w-full max-w-3xl flex-col gap-3 rounded-lg border bg-background/95 p-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">
              {selectionLabel(payerItems(selectedRows))}
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {formatEur(selectedTotal)} totale
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              className="h-11 flex-1 sm:flex-none"
              onClick={() => openReminderFor(Array.from(selected))}
            >
              Anteprima e sollecita {selectedFamilies}{" "}
              {selectedFamilies === 1 ? "famiglia" : "famiglie"}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11"
              onClick={() => exportCsv(Array.from(selected))}
              disabled={isExporting}
              aria-label="Esporta la selezione in CSV"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11"
              onClick={() => setSelected(new Set())}
              aria-label="Annulla la selezione"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <SendReminderDialog
        open={reminderOpen}
        onOpenChange={setReminderOpen}
        scheduleIds={reminderIds}
        payerCount={reminderFamilies}
        onSent={() => setSelected(new Set())}
      />

      {amountTarget ? (
        <ScheduleAmountDialog
          open
          onOpenChange={(open) => {
            if (!open) setAmountTarget(null)
          }}
          schedule={{
            id: amountTarget.id,
            courseName:
              amountTarget.course?.name ??
              amountTarget.notes ??
              "Contributo di iscrizione",
            dueDate: amountTarget.dueDate,
            amountCents: amountTarget.amountCents,
          }}
          reference={
            amountTarget.course && amountTarget.feeType === "MONTHLY"
              ? {
                  amountCents: amountTarget.course.monthlyFeeCents,
                  label: "quota del corso",
                }
              : null
          }
          onSuccess={() => setAmountTarget(null)}
        />
      ) : null}
    </>
  )
}
