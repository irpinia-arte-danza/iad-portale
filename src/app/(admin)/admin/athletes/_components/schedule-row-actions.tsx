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
import type { FeeType, ScheduleStatus } from "@prisma/client"

import type { ScheduleDisplayStatus } from "@/lib/utils/schedule-status"
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
  }
}

export function ScheduleRowActions({ schedule }: ScheduleRowActionsProps) {
  const openSettle = useOpenScheduleSettle()
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
