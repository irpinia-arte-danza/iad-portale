"use client"

import { useState } from "react"
import {
  BanknoteArrowUp,
  MoreHorizontal,
  RotateCcw,
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
import type { ScheduleStatus } from "@prisma/client"

import type { AthleteWithFormRelations } from "../../payments/queries"
import { ScheduleSettleDialog } from "./schedule-settle-dialog"
import { ScheduleUnwaiveDialog } from "./schedule-unwaive-dialog"
import { ScheduleWaiveDialog } from "./schedule-waive-dialog"

interface ScheduleRowActionsProps {
  schedule: {
    id: string
    status: ScheduleStatus
    displayStatus: ScheduleStatus
    courseEnrollmentId: string
    courseName: string
    dueDate: Date
    amountCents: number
    waiverReason: string | null
    paymentId: string | null
  }
  athleteId: string
  athleteFirstName: string
  athleteLastName: string
  athletesForPaymentForm: AthleteWithFormRelations[]
}

export function ScheduleRowActions({
  schedule,
  athleteId,
  athleteFirstName,
  athleteLastName,
  athletesForPaymentForm,
}: ScheduleRowActionsProps) {
  const [settleOpen, setSettleOpen] = useState(false)
  const [waiveOpen, setWaiveOpen] = useState(false)
  const [unwaiveOpen, setUnwaiveOpen] = useState(false)

  const canSettle =
    schedule.status === "DUE" || schedule.displayStatus === "OVERDUE"
  const canWaive = canSettle
  const canUnwaive = schedule.status === "WAIVED"

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
            <DropdownMenuItem onClick={() => setSettleOpen(true)}>
              <BanknoteArrowUp className="h-4 w-4" />
              Salda
            </DropdownMenuItem>
          )}
          {canWaive && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setWaiveOpen(true)}
                variant="destructive"
              >
                <RotateCcw className="h-4 w-4" />
                Condona
              </DropdownMenuItem>
            </>
          )}
          {canUnwaive && (
            <DropdownMenuItem onClick={() => setUnwaiveOpen(true)}>
              <Undo2 className="h-4 w-4" />
              Annulla condono
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {canSettle && (
        <ScheduleSettleDialog
          open={settleOpen}
          onOpenChange={setSettleOpen}
          schedule={{
            id: schedule.id,
            courseEnrollmentId: schedule.courseEnrollmentId,
            courseName: schedule.courseName,
            dueDate: schedule.dueDate,
            amountCents: schedule.amountCents,
          }}
          athleteId={athleteId}
          athleteFirstName={athleteFirstName}
          athleteLastName={athleteLastName}
          athletesForPaymentForm={athletesForPaymentForm}
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
