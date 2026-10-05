"use client"

import { useState } from "react"
import {
  BanknoteArrowUp,
  CalendarX,
  MoreHorizontal,
  PencilLine,
  Undo2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { FeeType, ScheduleStatus } from "@prisma/client"

import type { ScheduleDisplayStatus } from "@/lib/utils/schedule-status"
import { ScheduleAmountDialog } from "./schedule-amount-dialog"
import { useOpenScheduleSettle } from "./schedule-settle-provider"
import { ScheduleUnwaiveDialog } from "./schedule-unwaive-dialog"
import { ScheduleWaiveDialog } from "./schedule-waive-dialog"

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

export function ScheduleRowActions({ schedule }: ScheduleRowActionsProps) {
  const openSettle = useOpenScheduleSettle()
  const [waiveOpen, setWaiveOpen] = useState(false)
  const [unwaiveOpen, setUnwaiveOpen] = useState(false)
  const [amountOpen, setAmountOpen] = useState(false)

  const canSettle =
    schedule.status === "DUE" || schedule.displayStatus === "OVERDUE"
  const canWaive = canSettle
  const canUnwaive = schedule.status === "WAIVED"
  // L'importo si cambia su tutto ciò che non è pagato, condoni compresi
  const canEditAmount =
    schedule.status !== "PAID" && schedule.paymentId === null

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Azioni">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canSettle && (
            <DropdownMenuItem
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
              <BanknoteArrowUp className="h-4 w-4" />
              Salda
            </DropdownMenuItem>
          )}
          {canEditAmount && (
            <DropdownMenuItem onClick={() => setAmountOpen(true)}>
              <PencilLine className="h-4 w-4" />
              Modifica importo
            </DropdownMenuItem>
          )}
          {canWaive && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setWaiveOpen(true)}>
                <CalendarX className="h-4 w-4" />
                Segna come non dovuta
              </DropdownMenuItem>
            </>
          )}
          {canUnwaive && (
            <DropdownMenuItem onClick={() => setUnwaiveOpen(true)}>
              <Undo2 className="h-4 w-4" />
              Ripristina come dovuta
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

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

      {canWaive && (
        <ScheduleWaiveDialog
          open={waiveOpen}
          onOpenChange={setWaiveOpen}
          schedule={{
            id: schedule.id,
            courseName: schedule.courseName,
            dueDate: schedule.dueDate,
            amountCents: schedule.amountCents,
          }}
        />
      )}

      {canUnwaive && (
        <ScheduleUnwaiveDialog
          open={unwaiveOpen}
          onOpenChange={setUnwaiveOpen}
          schedule={{
            id: schedule.id,
            courseName: schedule.courseName,
            dueDate: schedule.dueDate,
          }}
        />
      )}
    </>
  )
}
