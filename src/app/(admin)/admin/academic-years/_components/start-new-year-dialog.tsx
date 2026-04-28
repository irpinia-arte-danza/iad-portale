"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { AlertTriangle, Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  academicYearSchema,
  type AcademicYearValues,
} from "@/lib/schemas/academic-year"
import { toDateInputValue } from "@/lib/utils/format"

import { createAndSetCurrentAcademicYear } from "../actions"

type CurrentSummary = {
  id: string
  label: string
  enrollmentsCount: number
  paymentsCount: number
  lessonsCount: number
} | null

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  current: CurrentSummary
  suggestedLabel: string
  suggestedStart: Date
  suggestedEnd: Date
  suggestedFeeEur: number
}

export function StartNewYearDialog({
  open,
  onOpenChange,
  current,
  suggestedLabel,
  suggestedStart,
  suggestedEnd,
  suggestedFeeEur,
}: Props) {
  const [busy, setBusy] = React.useState(false)

  const form = useForm<AcademicYearValues>({
    resolver: zodResolver(academicYearSchema),
    defaultValues: {
      label: suggestedLabel,
      startDate: suggestedStart,
      endDate: suggestedEnd,
      associationFeeEur: suggestedFeeEur,
      monthlyRenewalDay: 10,
    },
  })

  React.useEffect(() => {
    if (open) {
      form.reset({
        label: suggestedLabel,
        startDate: suggestedStart,
        endDate: suggestedEnd,
        associationFeeEur: suggestedFeeEur,
        monthlyRenewalDay: 10,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, suggestedLabel])

  async function onSubmit(values: AcademicYearValues) {
    setBusy(true)
    const result = await createAndSetCurrentAcademicYear(values)
    if (result.ok) {
      toast.success("Nuovo anno accademico impostato come corrente")
      onOpenChange(false)
    } else {
      toast.error(result.error)
    }
    setBusy(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Inizia nuovo anno accademico
          </DialogTitle>
          <DialogDescription>
            Crea il nuovo anno e imposta come corrente in un&apos;unica azione.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {current ? (
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <p className="font-medium">
                Anno corrente: <span className="font-mono">{current.label}</span>
              </p>
              <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                <li>
                  · {current.enrollmentsCount}{" "}
                  {current.enrollmentsCount === 1 ? "iscrizione" : "iscrizioni"}
                </li>
                <li>
                  · {current.paymentsCount}{" "}
                  {current.paymentsCount === 1 ? "pagamento" : "pagamenti"}
                </li>
                <li>
                  · {current.lessonsCount}{" "}
                  {current.lessonsCount === 1 ? "lezione" : "lezioni"}
                </li>
              </ul>
            </div>
          ) : null}

          <div className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/30">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
            <p className="text-amber-900 dark:text-amber-100">
              Da ora le dashboard genitori e insegnanti mostreranno solo i dati
              del nuovo anno. Le allieve attive andranno re-iscritte
              manualmente ai corsi del nuovo anno.
            </p>
          </div>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
              noValidate
            >
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nuovo anno</FormLabel>
                    <FormControl>
                      <Input placeholder="es. 2026-2027" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Inizio</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={
                            field.value
                              ? toDateInputValue(field.value)
                              : ""
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
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fine</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={
                            field.value
                              ? toDateInputValue(field.value)
                              : ""
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
              </div>

              <FormField
                control={form.control}
                name="associationFeeEur"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quota associativa (€)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="decimal"
                        step={0.5}
                        min={0}
                        max={1000}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ""
                              ? 0
                              : Number(e.target.value),
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  disabled={busy}
                >
                  Annulla
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creazione...
                    </>
                  ) : (
                    "Conferma e imposta come corrente"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
