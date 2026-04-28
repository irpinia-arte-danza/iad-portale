"use client"

import * as React from "react"
import { CalendarDays, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DAY_OF_WEEK_LABELS } from "@/lib/schemas/course-schedule"
import { formatDateShort } from "@/lib/utils/format"

import { deleteSchedule } from "../schedule-actions"
import { ScheduleFormDialog } from "./schedule-form-dialog"

type ScheduleItem = {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  location: string | null
  validFrom: Date
  validTo: Date | null
}

type Props = {
  courseId: string
  schedules: ScheduleItem[]
}

export function SchedulesSection({ courseId, schedules }: Props) {
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [busyDelete, setBusyDelete] = React.useState(false)

  const editing =
    editingId !== null ? schedules.find((s) => s.id === editingId) : null

  function openCreate() {
    setEditingId(null)
    setDialogOpen(true)
  }

  function openEdit(id: string) {
    setEditingId(id)
    setDialogOpen(true)
  }

  async function onConfirmDelete() {
    if (!deletingId) return
    setBusyDelete(true)
    const result = await deleteSchedule(deletingId)
    if (result.ok) {
      toast.success("Orario eliminato")
      setDeletingId(null)
    } else {
      toast.error(result.error)
    }
    setBusyDelete(false)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1.5">
          <CardTitle>Orari</CardTitle>
          <CardDescription>
            {schedules.length === 0
              ? "Nessun orario configurato"
              : `${schedules.length} ${
                  schedules.length === 1 ? "slot" : "slot"
                } settimanali`}
          </CardDescription>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" />
          Aggiungi
        </Button>
      </CardHeader>
      <CardContent>
        {schedules.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <CalendarDays className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Nessun orario configurato per questo corso.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {schedules.map((schedule) => (
              <li
                key={schedule.id}
                className="flex items-start justify-between gap-3 rounded-md border p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">
                      {DAY_OF_WEEK_LABELS[schedule.dayOfWeek] ?? "—"}
                    </span>
                    <span className="font-mono text-sm tabular-nums">
                      {schedule.startTime}–{schedule.endTime}
                    </span>
                  </div>
                  {schedule.location ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {schedule.location}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-muted-foreground">
                    Dal {formatDateShort(new Date(schedule.validFrom))}
                    {schedule.validTo
                      ? ` al ${formatDateShort(new Date(schedule.validTo))}`
                      : " · in corso"}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Azioni orario"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(schedule.id)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Modifica
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setDeletingId(schedule.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Elimina
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <ScheduleFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={editing ? "edit" : "create"}
        courseId={courseId}
        scheduleId={editing?.id}
        defaults={
          editing
            ? {
                dayOfWeek: editing.dayOfWeek,
                startTime: editing.startTime,
                endTime: editing.endTime,
                location: editing.location ?? "",
                validFrom: new Date(editing.validFrom),
                validTo: editing.validTo ? new Date(editing.validTo) : null,
              }
            : undefined
        }
      />

      <AlertDialog
        open={deletingId !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare l&apos;orario?</AlertDialogTitle>
            <AlertDialogDescription>
              L&apos;orario verrà rimosso definitivamente. Le lezioni già
              registrate impediranno l&apos;eliminazione.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busyDelete}>
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmDelete}
              disabled={busyDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busyDelete ? "Eliminazione..." : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
