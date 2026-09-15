"use client"

import { useMemo, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { eurToCents, planCollection } from "@/lib/payments/collection-plan"
import {
  FEE_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  paymentCreateSchema,
  type PaymentCreateValues,
} from "@/lib/schemas/payment"
import { formatDateShort, formatEur } from "@/lib/utils/format"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { registerPayment } from "../actions"
import type { AthleteWithFormRelations, OpenScheduleOption } from "../queries"

interface PaymentFormProps {
  athletes: AthleteWithFormRelations[]
  // Scadenze da incassare per allieva (id allieva → scadenze aperte)
  openSchedulesByAthlete: Record<string, OpenScheduleOption[]>
  defaultValues?: Partial<PaymentCreateValues>
  // Riceve l'id del pagamento creato: serve per emettere subito la ricevuta
  onSuccess?: (paymentId: string) => void
}

// Tipi per il pagamento libero (nessuna scadenza spuntata)
const FEE_TYPE_ORDER = [
  "TRIAL_LESSON",
  "OTHER",
  "ASSOCIATION",
  "MONTHLY",
  "STAGE",
  "SHOWCASE_1",
  "SHOWCASE_2",
  "COSTUME",
] as const

const METHOD_ORDER = ["CASH", "TRANSFER", "POS", "SUMUP_LINK", "OTHER"] as const

function toDateInputValue(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function centsToEur(cents: number): number {
  return Math.round(cents) / 100
}

function parseEurInput(value: string): number {
  const parsed = parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function isOverdue(dueDate: Date): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  return due.getTime() < today.getTime()
}

export function PaymentForm({
  athletes,
  openSchedulesByAthlete,
  defaultValues,
  onSuccess,
}: PaymentFormProps) {
  const [isPending, startTransition] = useTransition()

  const form = useForm<PaymentCreateValues>({
    resolver: zodResolver(paymentCreateSchema),
    defaultValues: {
      athleteId: "",
      parentId: "",
      paymentScheduleIds: [],
      scheduleAmountsEur: {},
      feeType: "OTHER",
      method: "CASH",
      amountEur: 0,
      paymentDate: new Date(),
      notes: "",
      ...defaultValues,
    },
  })

  const watchedAthleteId = form.watch("athleteId")
  const watchedFeeType = form.watch("feeType")
  const watchedAmount = form.watch("amountEur")
  const selectedIds = form.watch("paymentScheduleIds")
  const rowAmounts = form.watch("scheduleAmountsEur") ?? {}

  const selectedAthlete = useMemo(
    () => athletes.find((a) => a.id === watchedAthleteId),
    [athletes, watchedAthleteId],
  )
  const options = useMemo(
    () => openSchedulesByAthlete[watchedAthleteId] ?? [],
    [openSchedulesByAthlete, watchedAthleteId],
  )

  const selectedOptions = options.filter((o) => selectedIds.includes(o.id))
  const selectedCategory = selectedOptions[0]?.category ?? null
  const isMulti = selectedOptions.length >= 2
  const single = selectedOptions.length === 1 ? selectedOptions[0] : null
  const hasSeparateNumbering =
    selectedCategory !== null &&
    options.some((o) => o.category !== selectedCategory)
  const selectedTypesLabel = [
    ...new Set(selectedOptions.map((o) => FEE_TYPE_LABELS[o.feeType])),
  ].join(" + ")

  // Importo incassato di una riga: quello scritto, altrimenti la scadenza
  function rowCents(option: OpenScheduleOption): number {
    const eur = rowAmounts[option.id]
    return eur === undefined ? option.amountCents : eurToCents(eur)
  }

  // Stesse regole del server: con più scadenze niente righe a zero, oltre il
  // dovuto o con un totale diverso dalla somma
  const multiPlan = isMulti
    ? planCollection({
        schedules: selectedOptions.map((o) => ({
          id: o.id,
          amountCents: o.amountCents,
          description: o.description,
        })),
        totalCents: selectedOptions.reduce((sum, o) => sum + rowCents(o), 0),
        rowCents: Object.fromEntries(selectedOptions.map((o) => [o.id, rowCents(o)])),
      })
    : null
  const multiError = multiPlan && !multiPlan.ok ? multiPlan.error : null

  const singleCollectedCents = eurToCents(watchedAmount)
  const singleReduced =
    single !== null &&
    singleCollectedCents > 0 &&
    singleCollectedCents < single.amountCents
  const singleAbove =
    single !== null && singleCollectedCents > single.amountCents
  const hasReducedRow =
    singleReduced ||
    (isMulti && selectedOptions.some((o) => rowCents(o) < o.amountCents))

  const selectedTotalCents = isMulti
    ? selectedOptions.reduce((sum, o) => sum + rowCents(o), 0)
    : singleCollectedCents

  function setTotalFrom(ids: string[], amounts: Record<string, number>) {
    const chosen = options.filter((o) => ids.includes(o.id))
    const totalCents = chosen.reduce((sum, o) => {
      const eur = amounts[o.id]
      return sum + (eur === undefined ? o.amountCents : eurToCents(eur))
    }, 0)
    form.setValue("amountEur", centsToEur(totalCents), { shouldValidate: true })
  }

  // Spunta/togli: la riga entra con l'importo della scadenza e il totale si
  // ricalcola. Un importo già cambiato su una riga resta.
  function toggleSchedule(option: OpenScheduleOption, checked: boolean) {
    const current = form.getValues("paymentScheduleIds")
    const next = checked
      ? [...current, option.id]
      : current.filter((id) => id !== option.id)
    const amounts = { ...(form.getValues("scheduleAmountsEur") ?? {}) }
    if (checked) amounts[option.id] = centsToEur(option.amountCents)
    else delete amounts[option.id]

    form.setValue("paymentScheduleIds", next, { shouldValidate: true })
    form.setValue("scheduleAmountsEur", amounts)

    const chosen = options.filter((o) => next.includes(o.id))
    if (chosen.length > 0) {
      form.setValue("feeType", chosen[0].feeType)
      setTotalFrom(next, amounts)
    } else {
      form.setValue("amountEur", 0)
    }
  }

  function setRowAmount(optionId: string, eur: number) {
    const amounts = { ...(form.getValues("scheduleAmountsEur") ?? {}), [optionId]: eur }
    form.setValue("scheduleAmountsEur", amounts)
    setTotalFrom(form.getValues("paymentScheduleIds"), amounts)
  }

  function onSubmit(values: PaymentCreateValues) {
    const ids = values.paymentScheduleIds
    const payload: PaymentCreateValues = {
      ...values,
      // Solo le righe spuntate
      scheduleAmountsEur: Object.fromEntries(
        Object.entries(values.scheduleAmountsEur ?? {}).filter(([id]) =>
          ids.includes(id),
        ),
      ),
    }
    startTransition(async () => {
      const result = await registerPayment(payload)
      if (result.ok) {
        toast.success("Pagamento registrato")
        for (const warning of result.data?.warnings ?? []) {
          toast.warning(warning)
        }
        form.reset()
        if (result.data) onSuccess?.(result.data.id)
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="athleteId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Allieva</FormLabel>
              <Select
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value)
                  form.setValue("parentId", "")
                  form.setValue("paymentScheduleIds", [])
                  form.setValue("scheduleAmountsEur", {})
                  form.setValue("amountEur", 0)
                }}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona allieva…" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {athletes.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.lastName} {a.firstName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {selectedAthlete && (
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-medium">Scadenze da incassare</p>
              {selectedOptions.length > 0 ? (
                <p className="text-xs text-muted-foreground">Importo incassato</p>
              ) : null}
            </div>
            {options.length === 0 ? (
              <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                Nessuna scadenza aperta per questa allieva: puoi registrare un
                pagamento libero scegliendo il tipo quota.
              </p>
            ) : (
              <ul className="divide-y rounded-md border">
                {options.map((option) => {
                  const checked = selectedIds.includes(option.id)
                  const blocked =
                    !checked &&
                    selectedCategory !== null &&
                    option.category !== selectedCategory
                  // Importo sulla riga spuntata, sempre: stesso gesto con una o
                  // più scadenze (con una sola è sincronizzato con "Importo")
                  const editable = checked
                  const collected = rowCents(option)
                  return (
                    <li
                      key={option.id}
                      className="flex min-h-11 items-center gap-3 px-3 py-2"
                    >
                      <label
                        className={cn(
                          "flex min-w-0 flex-1 items-center gap-3",
                          blocked
                            ? "cursor-not-allowed opacity-50"
                            : "cursor-pointer",
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          disabled={blocked || isPending}
                          onCheckedChange={(value) =>
                            toggleSchedule(option, value === true)
                          }
                          aria-label={option.description}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm">
                            {option.description}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            Scadenza {formatDateShort(new Date(option.dueDate))}
                            {isOverdue(option.dueDate) ? " · in ritardo" : ""}
                          </span>
                        </span>
                      </label>
                      {editable ? (
                        <span className="flex shrink-0 flex-col items-end gap-0.5">
                          <Input
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            min="0.01"
                            max={option.amountCents / 100}
                            aria-label={`Importo incassato per ${option.description}`}
                            className="h-9 w-24 text-right font-mono tabular-nums"
                            value={
                              rowAmounts[option.id] === 0
                                ? ""
                                : (rowAmounts[option.id] ??
                                  centsToEur(option.amountCents))
                            }
                            disabled={isPending}
                            onChange={(e) =>
                              setRowAmount(option.id, parseEurInput(e.target.value))
                            }
                          />
                          {collected !== option.amountCents ? (
                            <span className="text-xs text-muted-foreground">
                              invece di{" "}
                              <span className="font-mono tabular-nums">
                                {formatEur(option.amountCents)}
                              </span>
                            </span>
                          ) : null}
                        </span>
                      ) : (
                        <span className="shrink-0 font-mono text-sm tabular-nums">
                          {formatEur(option.amountCents)}
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
            {hasSeparateNumbering ? (
              <p className="text-xs text-muted-foreground">
                Quote saggio e costumi hanno una numerazione ricevute separata:
                vanno registrate in un pagamento a parte.
              </p>
            ) : null}
            {selectedOptions.length > 0 ? (
              <div className="flex items-center justify-between gap-3 rounded-md bg-muted/50 px-3 py-2 text-sm">
                <span>
                  {selectedOptions.length === 1
                    ? "1 scadenza selezionata"
                    : `${selectedOptions.length} scadenze selezionate`}
                </span>
                <span className="font-mono font-semibold tabular-nums">
                  {formatEur(selectedTotalCents)}
                </span>
              </div>
            ) : null}
            {multiError ? (
              <p className="text-sm text-destructive">{multiError}</p>
            ) : null}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {selectedOptions.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Tipo quota</p>
              <p className="text-sm text-muted-foreground">
                {selectedTypesLabel}
              </p>
            </div>
          ) : (
            <FormField
              control={form.control}
              name="feeType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo quota</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {FEE_TYPE_ORDER.map((type) => (
                        <SelectItem key={type} value={type}>
                          {FEE_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="method"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Metodo</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {METHOD_ORDER.map((method) => (
                      <SelectItem key={method} value={method}>
                        {PAYMENT_METHOD_LABELS[method]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {selectedAthlete &&
        selectedOptions.length === 0 &&
        watchedFeeType === "ASSOCIATION" ? (
          <p className="rounded-md border bg-muted/50 p-3 text-sm">
            {options.some((o) => o.feeType === "ASSOCIATION")
              ? "La quota associativa dell'anno è nell'elenco sopra: spuntala per chiuderla."
              : "Nessuna quota associativa aperta per quest'anno. Se l'allieva non è ancora iscritta a un corso, il pagamento verrà abbinato alla quota quando la iscrivi."}
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="amountEur"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{isMulti ? "Importo totale (€)" : "Importo (€)"}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    readOnly={isMulti}
                    className={cn(
                      "font-mono tabular-nums",
                      isMulti ? "bg-muted" : undefined,
                    )}
                    value={field.value === 0 ? "" : field.value}
                    onChange={(e) => {
                      const eur = parseEurInput(e.target.value)
                      field.onChange(eur)
                      // Una scadenza: l'importo del pagamento è quello della riga
                      if (single) {
                        form.setValue("scheduleAmountsEur", { [single.id]: eur })
                      }
                    }}
                  />
                </FormControl>
                {isMulti ? (
                  <p className="text-xs text-muted-foreground">
                    Somma delle righe. Se una quota è ridotta cambia il suo
                    importo nell&apos;elenco: la scadenza si allinea e risulta
                    pagata.
                  </p>
                ) : singleReduced && single ? (
                  <p className="text-xs text-muted-foreground">
                    La scadenza passa da{" "}
                    <span className="font-mono tabular-nums">
                      {formatEur(single.amountCents)}
                    </span>{" "}
                    a{" "}
                    <span className="font-mono tabular-nums">
                      {formatEur(singleCollectedCents)}
                    </span>{" "}
                    e risulta pagata: nessun residuo.
                  </p>
                ) : singleAbove && single ? (
                  <p className="text-xs text-destructive">
                    Supera l&apos;importo della scadenza (
                    <span className="font-mono tabular-nums">
                      {formatEur(single.amountCents)}
                    </span>
                    ): se è denaro di un&apos;altra quota, registralo a parte.
                  </p>
                ) : null}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="paymentDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data pagamento</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    max={toDateInputValue(new Date())}
                    value={field.value ? toDateInputValue(field.value) : ""}
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

        {selectedAthlete && selectedAthlete.parentRelations.length > 0 && (
          <FormField
            control={form.control}
            name="parentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pagante (genitore)</FormLabel>
                <Select
                  value={field.value || "__none__"}
                  onValueChange={(value) =>
                    field.onChange(value === "__none__" ? "" : value)
                  }
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Nessuno" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="__none__">Nessuno</SelectItem>
                    {selectedAthlete.parentRelations.map((r) => (
                      <SelectItem key={r.parent.id} value={r.parent.id}>
                        {r.parent.lastName} {r.parent.firstName}
                        {r.isPrimaryPayer ? " (primario)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note (opzionale)</FormLabel>
              <FormControl>
                <Textarea
                  rows={2}
                  placeholder={
                    hasReducedRow
                      ? "Motivo, es. iscritta dal 15/09"
                      : "Note interne sul pagamento…"
                  }
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              {selectedOptions.length > 0 ? (
                <FormDescription>
                  Restano interne: la ricevuta riporta la causale della
                  scadenza.
                </FormDescription>
              ) : null}
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex sm:justify-end">
          <Button
            type="submit"
            disabled={isPending || multiError !== null || singleAbove}
            className="w-full sm:w-auto"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Registrazione…
              </>
            ) : (
              "Registra pagamento"
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}
