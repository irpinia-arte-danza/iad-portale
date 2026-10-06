"use client"

import * as React from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Sparkles } from "lucide-react"
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

import { todayDateOnly, toDateOnly } from "@/lib/utils/date-only"

import { createAcademicYear } from "../actions"

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

  // Il passaggio avviene la notte del giorno di inizio; se la data scelta è
  // oggi o già passata, il cron lo fa al prossimo giro
  const startDate = useWatch({ control: form.control, name: "startDate" })
  const becomesCurrent =
    startDate && toDateOnly(startDate).getTime() > todayDateOnly().getTime()
      ? `il ${formatDateShort(startDate)}`
      : "stanotte"

  // Il cron fa il passaggio solo se un anno solo copre la data: se il nuovo
  // comincia prima che il vecchio finisca, per quei giorni ne trova due e
  // non sceglie (lascia tutto com'è e scrive un avviso nei log)
  const overlapsCurrent =
    current !== null &&
    startDate !== undefined &&
    toDateOnly(startDate).getTime() <= toDateOnly(current.endDate).getTime()

  async function onSubmit(values: AcademicYearValues) {
    setBusy(true)
    // Solo creare: l'anno diventa corrente da solo, la notte in cui comincia
    // (cron academic-year-rollover). Impostarlo corrente qui, a giugno,
    // mostrerebbe a genitori e insegnanti un anno vuoto.
    const result = await createAcademicYear(values)
    if (result.ok) {
      toast.success(`Anno ${values.label} creato`)
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

          {/* Quando diventa corrente: lo decide il cron notturno, il giorno
              in cui l'anno comincia. La data è quella scritta qui sotto, e
              cambia con lei. */}
          <p className="rounded-md border bg-muted/30 p-3 text-sm">
            L&apos;anno viene creato ora e diventa quello corrente
            automaticamente {becomesCurrent}
            {current ? (
              <>
                : fino ad allora genitori e insegnanti continuano a vedere{" "}
                {current.label}
              </>
            ) : null}
            .
          </p>

          {overlapsCurrent && current ? (
            <p className="rounded-md border border-status-fix-border bg-status-fix-bg p-3 text-sm text-status-fix">
              Il {current.label} finisce il {formatDateShort(current.endDate)}
              : con un inizio precedente i due anni si sovrappongono e il
              passaggio automatico non avviene. Scegli un inizio successivo a
              quella data.
            </p>
          ) : null}

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
