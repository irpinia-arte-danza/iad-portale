"use client"

import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"

import {
  waiveScheduleSchema,
  type WaiveScheduleValues,
} from "@/lib/schemas/payment-schedule"

import { waiveSchedule } from "../schedules-actions"

interface ScheduleWaiveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  schedule: {
    id: string
    courseName: string
    dueDate: Date
    amountCents: number
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

function formatEur(cents: number): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100)
}

export function ScheduleWaiveDialog({
  open,
  onOpenChange,
  schedule,
  onSuccess,
}: ScheduleWaiveDialogProps) {
  const [isPending, startTransition] = useTransition()

  const form = useForm<WaiveScheduleValues>({
    resolver: zodResolver(waiveScheduleSchema),
    defaultValues: { waiverReason: "" },
  })

  function onSubmit(values: WaiveScheduleValues) {
    startTransition(async () => {
      const result = await waiveSchedule(schedule.id, values)
      if (result.ok) {
        toast.success("Scadenza segnata come non dovuta")
        onOpenChange(false)
        form.reset()
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
          <AlertDialogTitle>Segnare la scadenza come non dovuta?</AlertDialogTitle>
          <AlertDialogDescription>
            {schedule.courseName} — scadenza {formatDate(schedule.dueDate)} —{" "}
            {formatEur(schedule.amountCents)}. Questo contributo non è dovuto e non
            verrà richiesto. Indica il motivo (es. mese di chiusura, borsa di
            studio).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Form {...form}>
          <form
            id="waive-schedule-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="waiverReason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Es. mese di chiusura, borsa di studio…"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Annulla</AlertDialogCancel>
          <Button
            type="submit"
            form="waive-schedule-form"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvataggio…
              </>
            ) : (
              "Segna come non dovuta"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
