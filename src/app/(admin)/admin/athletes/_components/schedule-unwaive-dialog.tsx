"use client"

import { useTransition } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { unwaiveSchedule } from "../schedules-actions"

interface ScheduleUnwaiveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  schedule: {
    id: string
    courseName: string
    dueDate: Date
  }
  onSuccess?: () => void
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function ScheduleUnwaiveDialog({
  open,
  onOpenChange,
  schedule,
  onSuccess,
}: ScheduleUnwaiveDialogProps) {
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
      const result = await unwaiveSchedule(schedule.id)
      if (result.ok) {
        toast.success("Condono annullato")
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Annullare il condono?</AlertDialogTitle>
          <AlertDialogDescription>
            {schedule.courseName} — scadenza {formatDate(schedule.dueDate)}. La
            scadenza tornerà in stato &ldquo;In scadenza&rdquo; e il motivo del
            condono precedente verrà cancellato.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Annulla</AlertDialogCancel>
          <Button onClick={handleConfirm} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Annullamento…
              </>
            ) : (
              "Annulla condono"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
