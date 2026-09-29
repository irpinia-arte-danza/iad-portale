"use client"

import { useState, useTransition } from "react"
import { LogOut, MoreHorizontal, Pencil, Undo2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import {
  getCancelEnrollmentPreview,
  type CancelEnrollmentPreview,
} from "../enrollments-actions"
import { CancelEnrollmentDialog } from "./cancel-enrollment-dialog"
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
  const [preview, setPreview] = useState<CancelEnrollmentPreview | null>(null)
  const [loadingPreview, startPreview] = useTransition()

  // Ritira solo su un'iscrizione attiva; Annulla sempre, anche su una già
  // ritirata: è il modo per correggere un errore "chiuso" con Ritira.
  const canWithdraw = enrollment.withdrawalDate === null

  function openCancel() {
    startPreview(async () => {
      const result = await getCancelEnrollmentPreview(enrollment.id)
      if (result.ok && result.data) setPreview(result.data)
      else if (!result.ok) toast.error(result.error)
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Azioni">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-w-[19rem]">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
            Modifica note
          </DropdownMenuItem>

          {/* Le due voci dicono in cosa si differenziano, non solo come si
              chiamano: sceglierne una sbagliata costa rate lasciate dovute o
              storico cancellato. Ritira è l'operazione normale (niente rosso),
              Annulla è quella distruttiva. */}
          {canWithdraw ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setWithdrawOpen(true)}
                className="flex-col items-start gap-0.5"
              >
                <span className="flex items-center gap-2 font-medium">
                  <LogOut className="h-4 w-4" />
                  Ritira dal corso
                </span>
                <span className="pl-6 text-xs text-muted-foreground">
                  Ha frequentato e ora smette: restano dovuti i mesi fatti
                </span>
              </DropdownMenuItem>
            </>
          ) : null}

          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={openCancel}
            disabled={loadingPreview}
            variant="destructive"
            className="flex-col items-start gap-0.5"
          >
            <span className="flex items-center gap-2 font-medium">
              <Undo2 className="h-4 w-4" />
              Annulla iscrizione
            </span>
            <span className="pl-6 text-xs opacity-80">
              Inserita per errore: sparisce con le sue rate
            </span>
          </DropdownMenuItem>
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

      {preview ? (
        <CancelEnrollmentDialog
          open
          onOpenChange={(open) => {
            if (!open) setPreview(null)
          }}
          enrollment={{ id: enrollment.id, courseName: enrollment.courseName }}
          preview={preview}
        />
      ) : null}
    </>
  )
}
