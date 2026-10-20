"use client"

import { useState } from "react"
import { CalendarX, Undo2 } from "lucide-react"
import type { ScheduleStatus } from "@prisma/client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { ScheduleUnwaiveDialog } from "./schedule-unwaive-dialog"
import { ScheduleWaiveDialog } from "./schedule-waive-dialog"

// ─────────────────────────────────────────────────────────────────────────
// «Non dovuta» e «Rimetti come dovuta» come tasti, non voci di menu.
//
// Stavano solo nel menu «…» della rata in scheda allieva › Contributi e
// nessuno li trovava; i ritardi Giuseppina li gestisce da Scadenze. Stesso
// tasto, accanto a Incassa, in Scadenze, Contributi e Panoramica. I dialog
// (conferma e motivo) sono quelli di prima.
// ─────────────────────────────────────────────────────────────────────────

type WaivableSchedule = {
  id: string
  status: ScheduleStatus
  courseName: string
  dueDate: Date
  amountCents: number
}

// Aperta = da pagare: DUE (anche in ritardo, che è DUE con la data passata)
// e il vecchio OVERDUE. Pagate e già non dovute no.
export function canWaiveSchedule(status: ScheduleStatus): boolean {
  return status === "DUE" || status === "OVERDUE"
}

const BUTTON_CLASS = "h-11 md:h-9"

export function WaiveScheduleButton({
  schedule,
  className,
}: {
  schedule: WaivableSchedule
  className?: string
}) {
  const [open, setOpen] = useState(false)
  if (!canWaiveSchedule(schedule.status)) return null

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className={cn(BUTTON_CLASS, className)}
        onClick={() => setOpen(true)}
      >
        <CalendarX className="h-4 w-4" />
        Non dovuta
      </Button>
      <ScheduleWaiveDialog
        open={open}
        onOpenChange={setOpen}
        schedule={{
          id: schedule.id,
          courseName: schedule.courseName,
          dueDate: schedule.dueDate,
          amountCents: schedule.amountCents,
        }}
      />
    </>
  )
}

export function UnwaiveScheduleButton({
  schedule,
  className,
}: {
  schedule: Pick<WaivableSchedule, "id" | "status" | "courseName" | "dueDate">
  className?: string
}) {
  const [open, setOpen] = useState(false)
  if (schedule.status !== "WAIVED") return null

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className={cn(BUTTON_CLASS, className)}
        onClick={() => setOpen(true)}
      >
        <Undo2 className="h-4 w-4" />
        Rimetti come dovuta
      </Button>
      <ScheduleUnwaiveDialog
        open={open}
        onOpenChange={setOpen}
        schedule={{
          id: schedule.id,
          courseName: schedule.courseName,
          dueDate: schedule.dueDate,
        }}
      />
    </>
  )
}
