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
import { Input } from "@/components/ui/input"

import {
  withdrawEnrollmentSchema,
  type WithdrawEnrollmentValues,
} from "@/lib/schemas/enrollment"

import { withdrawEnrollment } from "../enrollments-actions"

interface WithdrawEnrollmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  enrollment: {
    id: string
    courseName: string
    athleteFirstName: string
  }
  onSuccess?: () => void
}

function toDateInputValue(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function WithdrawEnrollmentDialog({
  open,
  onOpenChange,
  enrollment,
  onSuccess,
}: WithdrawEnrollmentDialogProps) {
  const [isPending, startTransition] = useTransition()

  const form = useForm<WithdrawEnrollmentValues>({
    resolver: zodResolver(withdrawEnrollmentSchema),
    defaultValues: {
      withdrawalDate: new Date(),
    },
  })

  function onSubmit(values: WithdrawEnrollmentValues) {
    startTransition(async () => {
      const result = await withdrawEnrollment(enrollment.id, values)
      if (result.ok) {
        toast.success("Iscrizione ritirata")
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
          <AlertDialogTitle>Ritirare dal corso?</AlertDialogTitle>
          <AlertDialogDescription>
            Stai per ritirare {enrollment.athleteFirstName} da{" "}
            {enrollment.courseName}. L&apos;iscrizione verrà marcata come
            ritirata, lo storico sarà preservato. Questa azione non è
            reversibile dall&apos;interfaccia.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Form {...form}>
          <form
            id="withdraw-enrollment-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="withdrawalDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data ritiro</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      max={toDateInputValue(new Date())}
                      value={
                        field.value ? toDateInputValue(field.value) : ""
                      }
                      onChange={(e) =>
                        field.onChange(
                          e.target.value
                            ? new Date(e.target.value)
                            : undefined,
                        )
                      }
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
            form="withdraw-enrollment-form"
            disabled={isPending}
            variant="destructive"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Ritiro...
              </>
            ) : (
              "Ritira"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
