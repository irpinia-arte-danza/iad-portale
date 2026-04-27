"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2, MessageSquarePlus, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { AttendanceStatus } from "@prisma/client"

import { saveAttendance } from "../../../_actions/sessions"

type Item = {
  athleteId: string
  firstName: string
  lastName: string
  photoUrl: string | null
  currentStatus: AttendanceStatus | null
  currentNotes: string | null
}

type FormState = {
  status: AttendanceStatus | null
  notes: string
  notesOpen: boolean
}

const STATUS_OPTIONS: {
  value: AttendanceStatus
  label: string
  short: string
  className: string
  activeClassName: string
}[] = [
  {
    value: "PRESENT",
    label: "Presente",
    short: "P",
    className:
      "border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300",
    activeClassName:
      "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700",
  },
  {
    value: "ABSENT",
    label: "Assente",
    short: "A",
    className: "border-red-300 text-red-700 dark:border-red-800 dark:text-red-300",
    activeClassName: "bg-red-600 text-white border-red-600 hover:bg-red-700",
  },
  {
    value: "JUSTIFIED",
    label: "Giustificata",
    short: "G",
    className:
      "border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-300",
    activeClassName:
      "bg-amber-600 text-white border-amber-600 hover:bg-amber-700",
  },
]

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
  const [state, setState] = React.useState<Record<string, FormState>>(() =>
    Object.fromEntries(
      items.map((i) => [
        i.athleteId,
        {
          status: i.currentStatus,
          notes: i.currentNotes ?? "",
          notesOpen: !!i.currentNotes,
        } satisfies FormState,
      ]),
    ),
  )

  function setStatus(athleteId: string, status: AttendanceStatus) {
    if (locked) return
    setState((prev) => ({
      ...prev,
      [athleteId]: { ...prev[athleteId], status },
    }))
  }

  function setNotes(athleteId: string, notes: string) {
    setState((prev) => ({
      ...prev,
      [athleteId]: { ...prev[athleteId], notes },
    }))
  }

  function toggleNotes(athleteId: string) {
    setState((prev) => ({
      ...prev,
      [athleteId]: { ...prev[athleteId], notesOpen: !prev[athleteId].notesOpen },
    }))
  }

  const unmarked = items.filter(
    (i) => state[i.athleteId]?.status === null,
  ).length

  const dirty = items.some((i) => {
    const s = state[i.athleteId]
    return (
      s.status !== i.currentStatus ||
      (s.notes ?? "") !== (i.currentNotes ?? "")
    )
  })

  async function onSave() {
    setBusy(true)
    try {
      const itemsPayload = items
        .filter((i) => state[i.athleteId].status !== null)
        .map((i) => ({
          athleteId: i.athleteId,
          status: state[i.athleteId].status!,
          notes: state[i.athleteId].notes.trim() || null,
        }))

      if (itemsPayload.length === 0) {
        toast.error("Seleziona almeno una marcatura")
        setBusy(false)
        return
      }

      const result = await saveAttendance({ lessonId, items: itemsPayload })
      if (!result.ok) {
        toast.error(result.error)
        setBusy(false)
        return
      }
      toast.success("Presenze salvate")
      router.refresh()
    } catch (error) {
      console.error("[attendance form] save error", error)
      toast.error("Errore salvataggio presenze")
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
              const s = state[item.athleteId]
              return (
                <li key={item.athleteId} className="flex flex-col gap-3 p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold uppercase">
                      {item.firstName.charAt(0)}
                      {item.lastName.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {item.firstName} {item.lastName}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "min-h-11 shrink-0 text-xs",
                        s.notesOpen && "bg-muted",
                      )}
                      onClick={() => toggleNotes(item.athleteId)}
                      aria-label="Note"
                    >
                      <MessageSquarePlus className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {STATUS_OPTIONS.map((opt) => {
                      const active = s.status === opt.value
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          disabled={locked || busy}
                          onClick={() => setStatus(item.athleteId, opt.value)}
                          className={cn(
                            "flex min-h-11 items-center justify-center gap-1 rounded-md border px-3 py-2 text-sm font-medium transition",
                            active ? opt.activeClassName : opt.className,
                            (locked || busy) && "cursor-not-allowed opacity-60",
                          )}
                          aria-pressed={active}
                        >
                          {active ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <span className="font-bold tabular-nums">
                              {opt.short}
                            </span>
                          )}
                          <span className="hidden sm:inline">{opt.label}</span>
                        </button>
                      )
                    })}
                  </div>

                  {s.notesOpen ? (
                    <Textarea
                      placeholder="Note (opzionale)"
                      value={s.notes}
                      onChange={(e) =>
                        setNotes(item.athleteId, e.target.value)
                      }
                      disabled={locked || busy}
                      maxLength={500}
                      rows={2}
                    />
                  ) : null}
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>

      {!locked ? (
        <div className="sticky bottom-20 z-10 -mx-4 border-t bg-card px-4 py-3 shadow-md sm:mx-0 sm:rounded-md sm:border">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {unmarked === 0
                ? "Tutte registrate"
                : `${unmarked} ${unmarked === 1 ? "non registrata" : "non registrate"}`}
            </p>
            <Button
              onClick={onSave}
              disabled={busy || !dirty}
              className="min-h-11"
            >
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                "Salva presenze"
              )}
            </Button>
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
            <X className="h-4 w-4" />
            Lezione registrata. Per modificare contatta l&apos;amministratore.
          </CardContent>
        </Card>
      )}
    </>
  )
}
