"use client"

import { useState } from "react"
import { LogOut, MoreHorizontal, Pencil } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { EnrollmentEditDialog } from "./enrollment-edit-dialog"
import { WithdrawEnrollmentDialog } from "./withdraw-enrollment-dialog"

interface EnrollmentRowActionsProps {
  enrollment: {
    id: string
    notes: string | null
    withdrawalDate: Date | null
    courseName: string
    athleteFirstName: string
  }
}

export function EnrollmentRowActions({ enrollment }: EnrollmentRowActionsProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)

  const canWithdraw = enrollment.withdrawalDate === null

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Azioni">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
            Modifica note
          </DropdownMenuItem>
          {canWithdraw && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setWithdrawOpen(true)}
                variant="destructive"
              >
                <LogOut className="h-4 w-4" />
                Ritira dal corso
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <EnrollmentEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        enrollment={{
          id: enrollment.id,
          notes: enrollment.notes,
          courseName: enrollment.courseName,
        }}
      />

      {canWithdraw && (
        <WithdrawEnrollmentDialog
          open={withdrawOpen}
          onOpenChange={setWithdrawOpen}
          enrollment={{
            id: enrollment.id,
            courseName: enrollment.courseName,
            athleteFirstName: enrollment.athleteFirstName,
          }}
        />
      )}
    </>
  )
}
