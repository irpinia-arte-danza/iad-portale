"use client"

import { useEffect, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useBeforeUnloadGuard } from "@/lib/hooks/use-dirty-form"
import {
  counterCandidate,
  formatReceiptNumber,
  NO_PERIOD_KEY,
  nextReceiptSequence,
  periodKey,
} from "@/lib/receipts/numbering-config"
import type { NumberingPreviewContext } from "@/lib/receipts/numbering-context"
import {
  ricevuteSchema,
  type RicevuteValues,
} from "@/lib/schemas/admin-settings"

import { updateRicevute } from "../actions"
import { StickySaveBar } from "./sticky-save-bar"

const YEAR_MODE_LABELS = [
  { value: "NONE", label: "Nessuno" },
  { value: "CALENDAR", label: "Anno solare (2026)" },
  { value: "ACADEMIC", label: "Anno accademico (2026-27)" },
] as const

const RESET_MODE_LABELS = [
  { value: "NEVER", label: "Mai" },
  { value: "CALENDAR", label: "Ogni anno solare" },
  { value: "ACADEMIC", label: "Ogni anno accademico" },
] as const

const DIGIT_LABELS = [
  { value: 1, label: "1 (senza zeri)" },
  { value: 3, label: "001" },
  { value: 4, label: "0001" },
] as const

interface RicevuteTabProps {
  initial: RicevuteValues
  // Massimi già emessi per ciascun tipo di riavvio: bastano a ricalcolare
  // l'anteprima nel browser, senza tornare al server a ogni opzione
  preview: NumberingPreviewContext
  onDirtyChange: (dirty: boolean) => void
}

export function RicevuteTab({
  initial,
  preview,
  onDirtyChange,
}: RicevuteTabProps) {
  const [isPending, startTransition] = useTransition()

  const form = useForm<RicevuteValues>({
    resolver: zodResolver(ricevuteSchema),
    defaultValues: initial,
    mode: "onBlur",
  })

  const isDirty = form.formState.isDirty
  useBeforeUnloadGuard(isDirty)
  useEffect(() => {
    onDirtyChange(isDirty)
  }, [isDirty, onDirtyChange])

  const prefix = form.watch("receiptPrefix")
  const counter = form.watch("receiptNumber")
  const yearMode = form.watch("receiptYearMode")
  const resetMode = form.watch("receiptResetMode")
  const digits = form.watch("receiptDigits")

  // Anteprima dal vivo: stesse funzioni dell'emissione, quindi quello che si
  // legge qui è quello che uscirà davvero. È la cosa che impedisce di
  // sbagliare: il risultato si vede prima di salvare.
  const pendingConfig = {
    prefix: prefix ?? "",
    yearMode,
    resetMode,
    digits: digits ?? 3,
  }
  const pendingPeriod = periodKey(
    pendingConfig,
    preview.issueDate,
    preview.academicYearLabel,
  )
  const nextNumber = formatReceiptNumber({
    config: pendingConfig,
    issueDate: preview.issueDate,
    academicYearLabel: preview.academicYearLabel,
    sequence: nextReceiptSequence(
      counterCandidate(
        { period: preview.storedPeriod, number: counter ?? 0 },
        pendingPeriod,
      ),
      preview.maxByResetMode[resetMode],
    ),
    category: "REGULAR",
  })

  const periodoContatore =
    preview.storedPeriod === NO_PERIOD_KEY || preview.storedPeriod === null
      ? "serie unica"
      : `periodo ${preview.storedPeriod}`

  function onSubmit(values: RicevuteValues) {
    startTransition(async () => {
      const res = await updateRicevute(values)
      if (res.ok) {
        toast.success("Impostazioni ricevute aggiornate")
        form.reset(values)
      } else {
        toast.error(res.error)
      }
    })
  }

  function onDiscard() {
    form.reset(initial)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Numerazione</CardTitle>
            <CardDescription>
              Come si compone il numero di ricevuta. Le ricevute già emesse non
              cambiano mai: restano con il numero che hanno.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 rounded-md border bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">
                Prossimo numero
              </p>
              <p className="font-mono text-xl font-semibold">{nextNumber}</p>
            </div>

            <FormField
              control={form.control}
              name="receiptPrefix"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prefisso</FormLabel>
                  <FormControl>
                    <Input {...field} className="font-mono" placeholder="IAD/" />
                  </FormControl>
                  <FormDescription>
                    Compare all&apos;inizio del numero. Caratteri: A-Z 0-9 / _ -
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="receiptNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Ultimo numero usato ({periodoContatore})
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      value={field.value}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === ""
                            ? 0
                            : Number.parseInt(e.target.value, 10),
                        )
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    Modifica solo se stai importando ricevute esistenti: il
                    prossimo numero lo vedi qui sopra.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="receiptYearMode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Anno nel numero</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {YEAR_MODE_LABELS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    L&apos;anno è quello della data di emissione.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="receiptResetMode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Riparte da 1</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {RESET_MODE_LABELS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Il riavvio si calcola a ogni emissione: non dipende da
                    un&apos;operazione da fare il 1° gennaio.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="receiptDigits"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cifre del progressivo</FormLabel>
                  <Select
                    value={String(field.value)}
                    onValueChange={(v) => field.onChange(Number.parseInt(v, 10))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DIGIT_LABELS.map((o) => (
                        <SelectItem key={o.value} value={String(o.value)}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Un numero più lungo delle cifre scelte non viene troncato.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Testo in calce (opzionale)</CardTitle>
            <CardDescription>
              Note legali o messaggio breve stampato nel footer della ricevuta
              PDF (es. art. 15 TUIR).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="receiptFooter"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value ?? ""}
                      rows={4}
                      placeholder="Es. Detraibilità art. 15 TUIR per minori 5-18 anni…"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <StickySaveBar
          visible={isDirty}
          submitting={isPending}
          onSave={form.handleSubmit(onSubmit)}
          onDiscard={onDiscard}
        />
      </form>
    </Form>
  )
}
