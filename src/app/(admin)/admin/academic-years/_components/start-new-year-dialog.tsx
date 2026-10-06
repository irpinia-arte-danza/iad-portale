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
import {
  formatDateShort,
  formatEuro,
  toDateInputValue,
} from "@/lib/utils/format"

import { createAndSetCurrentAcademicYear } from "../actions"

type CurrentSummary = {
  id: string
  label: string
  enrollmentsCount: number
  paymentsCount: number
  lessonsCount: number
  endDate: Date
} | null

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  current: CurrentSummary
  // L'anno corrente non è ancora finito (giugno): cambia cosa succede
  // stanotte, e il riepilogo lo deve dire
  currentStillRunning: boolean
  suggestedLabel: string
  suggestedStart: Date
  suggestedEnd: Date
  suggestedFeeEur: number
}

export function StartNewYearDialog({
  open,
  onOpenChange,
  current,
  currentStillRunning,
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
      toast.success(`Anno ${values.label} creato e impostato come corrente`)
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
            <Sparkles className="h-5 w-5 text-muted-foreground" />
            Prepara il {suggestedLabel}
          </DialogTitle>
          <DialogDescription>
            Prima di confermare, ecco cosa succede e cosa no.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Il riepilogo dice quello che l'azione fa davvero: crea l'anno e
              lo imposta come corrente. Non copia iscrizioni né rate — e
              scriverlo è il punto, perché è la cosa che ci si aspetta di più */}
          <dl className="space-y-3 rounded-md border bg-muted/30 p-3 text-sm">
            <div>
              <dt className="font-medium">Cosa viene creato</dt>
              <dd className="text-muted-foreground">
                L&apos;anno {suggestedLabel}, con il contributo di iscrizione
                del {current?.label ?? "anno precedente"} (
                <span className="font-mono">
                  {formatEuro(Math.round(suggestedFeeEur * 100))}
                </span>
                ). Date e importo si possono cambiare qui sotto.
              </dd>
            </div>
            <div>
              <dt className="font-medium">Cosa resta com&apos;è</dt>
              <dd className="text-muted-foreground">
                Allieve, genitori, insegnanti e corsi: non appartengono a un
                anno, li ritrovi tutti.
              </dd>
            </div>
            {current ? (
              <div>
                <dt className="font-medium">Cosa non viene toccato</dt>
                <dd className="text-muted-foreground">
                  Iscrizioni, rate, pagamenti, ricevute e presenze del{" "}
                  {current.label} restano nel {current.label} e si consultano
                  come oggi ({current.enrollmentsCount}{" "}
                  {current.enrollmentsCount === 1 ? "iscrizione" : "iscrizioni"}
                  , {current.paymentsCount}{" "}
                  {current.paymentsCount === 1 ? "pagamento" : "pagamenti"},{" "}
                  {current.lessonsCount}{" "}
                  {current.lessonsCount === 1 ? "lezione" : "lezioni"}).
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="font-medium">Cosa c&apos;è da fare dopo</dt>
              <dd className="text-muted-foreground">
                Iscrivere le allieve ai corsi del {suggestedLabel}: le
                iscrizioni non si copiano da un anno all&apos;altro.
              </dd>
            </div>
          </dl>

          <div className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/30">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
            <div className="space-y-1 text-amber-900 dark:text-amber-100">
              <p>
                Appena confermi, il {suggestedLabel} diventa l&apos;anno
                corrente: le aree di genitori e insegnanti mostrano il nuovo
                anno.
              </p>
              {current && currentStillRunning ? (
                <p>
                  Il {current.label} però non è finito (termina il{" "}
                  {formatDateShort(current.endDate)}): stanotte il portale lo
                  rimette come corrente da solo, e passa al {suggestedLabel}{" "}
                  il {formatDateShort(suggestedStart)}.
                </p>
              ) : null}
            </div>
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
                    <FormLabel>Contributo di iscrizione (€)</FormLabel>
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
                    `Crea il ${suggestedLabel}`
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
