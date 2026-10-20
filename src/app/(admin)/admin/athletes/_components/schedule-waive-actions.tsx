"use client"

import { useState, type ReactNode } from "react"
import { CalendarX, MoreHorizontal, Undo2 } from "lucide-react"
import type { ScheduleStatus } from "@prisma/client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

import { ScheduleUnwaiveDialog } from "./schedule-unwaive-dialog"
import { ScheduleWaiveDialog } from "./schedule-waive-dialog"

// ─────────────────────────────────────────────────────────────────────────
// «Segna come non dovuta» e «Rimetti come dovuta».
//
// Non dovuta è una voce del menu «…» della riga (Scadenze, Contributi,
// Panoramica): come tasto accanto a Incassa (#63) faceva concorrenza
// all'azione che si usa davvero. Rimetti come dovuta resta un tasto, sulle
// rate non dovute in Contributi. I dialog (conferma e motivo) sono quelli
// di sempre.
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

// La voce di menu e il suo dialog. Il dialog sta fuori dal menu: quando si
// sceglie la voce il menu si chiude e il dialog deve restare aperto.
// item è null dove la rata non si può segnare (pagata, già non dovuta).
export function useWaiveScheduleMenuItem(schedule: WaivableSchedule): {
  item: ReactNode
  dialog: ReactNode
} {
  const [open, setOpen] = useState(false)
  if (!canWaiveSchedule(schedule.status)) return { item: null, dialog: null }

  return {
    item: (
      <DropdownMenuItem onSelect={() => setOpen(true)}>
        <CalendarX className="h-4 w-4" />
        Segna come non dovuta
      </DropdownMenuItem>
    ),
    dialog: (
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
    ),
  }
}

// Il menu «…» con la sola voce, per le righe che un menu non l'avevano
// (Panoramica). Niente menu vuoto sulle rate che non si possono segnare.
export function WaiveScheduleMenu({ schedule }: { schedule: WaivableSchedule }) {
  const { item, dialog } = useWaiveScheduleMenuItem(schedule)
  if (!item) return null

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Altre azioni"
            className="max-md:size-11 max-md:shrink-0"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56">{item}</DropdownMenuContent>
      </DropdownMenu>
      {dialog}
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
