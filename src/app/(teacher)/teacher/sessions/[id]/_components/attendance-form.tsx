"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import type { AttendanceStatus } from "@prisma/client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { logError } from "@/lib/logging/log-error"
import { cn } from "@/lib/utils"

import { saveAttendance } from "../../../_actions/sessions"

// ─────────────────────────────────────────────────────────────────────────
// Le presenze con una mano sola: una riga per allieva, una casella grande
// (spuntata = presente), un solo tasto Salva in fondo. Chi non è spuntata al
// salvataggio risulta assente; «giustificata» resta come opzione secondaria
// sulla riga, senza colori: presente e assente non sono stati che bloccano.
// Le note per allieva non si scrivono più da qui; quelle già salvate restano.
// ─────────────────────────────────────────────────────────────────────────

type Item = {
  athleteId: string
  firstName: string
  lastName: string
  currentStatus: AttendanceStatus | null
  currentNotes: string | null
}

type RowState = { present: boolean; justified: boolean }

function initialRow(item: Item): RowState {
  return {
    present: item.currentStatus === "PRESENT",
    justified: item.currentStatus === "JUSTIFIED",
  }
}

function statusOf(row: RowState): AttendanceStatus {
  if (row.present) return "PRESENT"
  return row.justified ? "JUSTIFIED" : "ABSENT"
}

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  PRESENT: "Presente",
  ABSENT: "Assente",
  JUSTIFIED: "Giustificata",
}

export function AttendanceForm({
  lessonId,
  items,
  locked,
}: {
  lessonId: string
  items: Item[]
  locked: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = React.useState(false)
  const [rows, setRows] = React.useState<Record<string, RowState>>(() =>
    Object.fromEntries(items.map((i) => [i.athleteId, initialRow(i)])),
  )

  function setPresent(athleteId: string, present: boolean) {
    setRows((prev) => ({
      ...prev,
      [athleteId]: { present, justified: present ? false : prev[athleteId].justified },
    }))
  }

  function toggleJustified(athleteId: string) {
    setRows((prev) => ({
      ...prev,
      [athleteId]: { present: false, justified: !prev[athleteId].justified },
    }))
  }

  const presentCount = items.filter((i) => rows[i.athleteId].present).length
  // Una lezione mai segnata si può salvare anche senza spunte (tutte
  // assenti); una già segnata solo se qualcosa è cambiato
  const hasRecords = items.some((i) => i.currentStatus !== null)
  const dirty = items.some((i) => statusOf(rows[i.athleteId]) !== (i.currentStatus ?? "ABSENT"))
  const canSave = !locked && !busy && (!hasRecords || dirty)

  async function onSave() {
    setBusy(true)
    try {
      const result = await saveAttendance({
        lessonId,
        items: items.map((i) => ({
          athleteId: i.athleteId,
          status: statusOf(rows[i.athleteId]),
          // Le note scritte in passato non si perdono
          notes: i.currentNotes,
        })),
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(
        `Presenze salvate: ${presentCount} ${presentCount === 1 ? "presente" : "presenti"} su ${items.length}`,
      )
      router.refresh()
    } catch (error) {
      logError("[attendance form] save error", error)
      toast.error("Non è stato possibile salvare le presenze, riprova")
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <ul className="divide-y">
            {items.map((item) => {
              const row = rows[item.athleteId]
              const checkboxId = `presente-${item.athleteId}`
              return (
                <li key={item.athleteId} className="flex items-center gap-2 pr-2">
                  {/* L'etichetta è tutta la riga: il dito prende il nome, non
                      solo la casella */}
                  <label
                    htmlFor={checkboxId}
                    className={cn(
                      "flex min-h-14 flex-1 cursor-pointer items-center gap-3 py-2 pl-3",
                      locked && "cursor-default",
                    )}
                  >
                    <Checkbox
                      id={checkboxId}
                      className="size-6 [&_svg]:size-4"
                      checked={row.present}
                      disabled={locked || busy}
                      onCheckedChange={(checked) =>
                        setPresent(item.athleteId, checked === true)
                      }
                    />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-base font-medium">
                        {item.firstName} {item.lastName}
                      </span>
                      {locked ? (
                        <span className="text-xs text-muted-foreground">
                          {item.currentStatus ? STATUS_LABEL[item.currentStatus] : "Non segnata"}
                        </span>
                      ) : !row.present && row.justified ? (
                        <span className="text-xs text-muted-foreground">Assenza giustificata</span>
                      ) : null}
                    </span>
                  </label>
                  {!locked && !row.present ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={cn("min-h-11 shrink-0 text-xs", row.justified && "bg-muted")}
                      aria-pressed={row.justified}
                      disabled={busy}
                      onClick={() => toggleJustified(item.athleteId)}
                    >
                      Giustificata
                    </Button>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>

      {!locked ? (
        <div className="sticky bottom-20 z-10 -mx-4 border-t bg-card/95 px-4 py-3 shadow-md backdrop-blur sm:mx-0 sm:rounded-md sm:border">
          <p className="mb-2 text-center text-xs text-muted-foreground" aria-live="polite">
            {presentCount} {presentCount === 1 ? "presente" : "presenti"} su {items.length}
            {" · "}chi non è spuntata risulta assente
          </p>
          <Button onClick={onSave} disabled={!canSave} className="min-h-11 w-full">
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Salvataggio…
              </>
            ) : (
              "Salva"
            )}
          </Button>
        </div>
      ) : null}
    </>
  )
}
