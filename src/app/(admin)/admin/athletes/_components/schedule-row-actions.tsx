"use client"

import { useState } from "react"
import { MoreHorizontal, PencilLine, Wallet } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { FeeType, ScheduleStatus } from "@prisma/client"

import type { ScheduleDisplayStatus } from "@/lib/utils/schedule-status"
import { ScheduleAmountDialog } from "./schedule-amount-dialog"
import { useOpenScheduleSettle } from "./schedule-settle-provider"
import { UnwaiveScheduleButton, useWaiveScheduleMenuItem } from "./schedule-waive-actions"

interface ScheduleRowActionsProps {
  schedule: {
    id: string
    status: ScheduleStatus
    displayStatus: ScheduleDisplayStatus
    feeType: FeeType
    // null per la quota associativa, che non è legata a un corso
    courseEnrollmentId: string | null
    courseName: string
    dueDate: Date
    amountCents: number
    waiverReason: string | null
    paymentId: string | null
    // Quota mensile del corso, per il tasto "Riporta a …". null dove un
    // riferimento non c'è (contributo di iscrizione, stage, saggio, costume).
    referenceAmountCents: number | null
  }
}

// In vista quello che si fa sempre: Incassa sulle rate aperte, Rimetti come
// dovuta su quelle non dovute. Nel menu «…» il resto: importo e «Segna come
// non dovuta».
export function ScheduleRowActions({ schedule }: ScheduleRowActionsProps) {
  const openSettle = useOpenScheduleSettle()
  const [amountOpen, setAmountOpen] = useState(false)
  const waive = useWaiveScheduleMenuItem(schedule)

  const canSettle =
    schedule.status === "DUE" || schedule.displayStatus === "OVERDUE"
  // L'importo si cambia su tutto ciò che non è pagato, condoni compresi
  const canEditAmount =
    schedule.status !== "PAID" && schedule.paymentId === null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canSettle && (
        <Button
          size="sm"
          className="h-11 md:h-9"
          onClick={() =>
            openSettle({
              id: schedule.id,
              feeType: schedule.feeType,
              courseEnrollmentId: schedule.courseEnrollmentId,
              courseName: schedule.courseName,
              dueDate: schedule.dueDate,
              amountCents: schedule.amountCents,
            })
          }
        >
          <Wallet className="h-4 w-4" />
          Incassa
        </Button>
      )}
      <UnwaiveScheduleButton schedule={schedule} />

      {(canEditAmount || waive.item) && (
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
          <DropdownMenuContent align="end" className="min-w-56">
            {canEditAmount && (
              <DropdownMenuItem onClick={() => setAmountOpen(true)}>
                <PencilLine className="h-4 w-4" />
                Modifica importo
              </DropdownMenuItem>
            )}
            {waive.item}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {waive.dialog}

      {canEditAmount && (
        <ScheduleAmountDialog
          open={amountOpen}
          onOpenChange={setAmountOpen}
          schedule={{
            id: schedule.id,
            courseName: schedule.courseName,
            dueDate: schedule.dueDate,
            amountCents: schedule.amountCents,
          }}
          reference={
            schedule.referenceAmountCents !== null
              ? {
                  amountCents: schedule.referenceAmountCents,
                  label: "quota del corso",
                }
              : null
          }
        />
      )}
    </div>
  )
}
