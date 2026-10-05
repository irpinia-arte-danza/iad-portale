"use client"

import { useMemo, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { AlertTriangle, Loader2 } from "lucide-react"
import { toast } from "sonner"

import {
  collectionCapCents,
  eurToCents,
  planCollection,
} from "@/lib/payments/collection-plan"
import {
  monthBadge,
  raisedRows,
  reducedRows,
} from "@/lib/payments/reduced-collection"
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
          referenceAmountCents: o.referenceAmountCents,
        })),
        totalCents: selectedOptions.reduce((sum, o) => sum + rowCents(o), 0),
        rowCents: Object.fromEntries(selectedOptions.map((o) => [o.id, rowCents(o)])),
      })
    : null
  const multiError = multiPlan && !multiPlan.ok ? multiPlan.error : null

  const singleCollectedCents = eurToCents(watchedAmount)
  const singleCap = single !== null ? collectionCapCents(single) : 0
  const singleAbove = single !== null && singleCollectedCents > singleCap
  // Le scadenze che verrebbero abbassate, con nome e importi: è la frase che
  // va letta prima di confermare. Vale per una sola scadenza come per più.
  const righeIncasso =
    single !== null
      ? [
          {
            id: single.id,
            description: single.description,
            amountCents: single.amountCents,
            collectedCents: singleCollectedCents,
          },
        ]
      : selectedOptions.map((o) => ({
          id: o.id,
          description: o.description,
          amountCents: o.amountCents,
          collectedCents: rowCents(o),
        }))
  const righeRidotte = reducedRows(righeIncasso)
  // Righe che tornano su: l'importo della scadenza era rimasto sotto la quota
  const righeRialzate = raisedRows(righeIncasso)
  const hasReducedRow = righeRidotte.length > 0

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
                pagamento libero scegliendo la causale.
              </p>
            ) : (
              <ul className="space-y-2">
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
                      className={cn(
                        "flex min-h-11 items-center gap-3 rounded-md border px-3 py-2",
                        checked && "border-primary/50 bg-primary/5",
                      )}
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
                        {option.feeType === "MONTHLY" ? (
                          <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold tabular-nums">
                            {monthBadge(new Date(option.dueDate))}
                          </span>
                        ) : null}
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
                            max={collectionCapCents(option) / 100}
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
                          {option.referenceAmountCents !== null &&
                          option.amountCents < option.referenceAmountCents ? (
                            <span className="max-w-[16rem] text-right text-xs text-amber-700 dark:text-amber-400">
                              La quota del corso è{" "}
                              <span className="font-mono tabular-nums">
                                {formatEur(option.referenceAmountCents)}
                              </span>
                              : puoi incassarla per intero e la scadenza torna
                              a quella cifra.
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
                I contributi saggio e costumi hanno una numerazione ricevute separata:
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
              <p className="text-sm font-medium">Causale</p>
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
                  <FormLabel>Causale</FormLabel>
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
              ? "Il contributo di iscrizione dell'anno è nell'elenco sopra: spuntalo per chiuderlo."
              : "Nessun contributo di iscrizione aperto per quest'anno. Se l'allieva non è ancora iscritta a un corso, il pagamento verrà abbinato al contributo quando la iscrivi."}
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
                    Somma delle righe. Per incassare un importo diverso su un
                    contributo cambialo nell&apos;elenco.
                  </p>
                ) : singleAbove && single ? (
                  <p className="text-xs text-destructive">
                    Supera l&apos;importo della scadenza (
                    <span className="font-mono tabular-nums">
                      {formatEur(single.amountCents)}
                    </span>
                    ): se è denaro di un altro contributo, registralo a parte.
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

        {righeRialzate.length > 0 ? (
          <div className="space-y-2 rounded-md border border-amber-400 bg-amber-50 p-3 text-sm dark:border-amber-700 dark:bg-amber-950/40">
            <p className="flex items-start gap-2 font-medium text-amber-900 dark:text-amber-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {righeRialzate.length === 1
                ? "Questa scadenza era rimasta sotto la quota del corso:"
                : "Queste scadenze erano rimaste sotto la quota del corso:"}
            </p>
            <ul className="space-y-1 pl-6 text-amber-900 dark:text-amber-100">
              {righeRialzate.map((r) => (
                <li key={r.id}>
                  <strong>{r.description}</strong>: era a{" "}
                  <span className="font-mono tabular-nums">
                    {formatEur(r.fromCents)}
                  </span>
                  . Registrando torna a{" "}
                  <span className="font-mono tabular-nums">
                    {formatEur(r.toCents)}
                  </span>{" "}
                  e risulta <strong>pagata</strong>.
                </li>
              ))}
            </ul>
            <p className="pl-6 text-xs text-amber-800 dark:text-amber-200">
              La correzione dell&apos;importo resta nel registro delle
              modifiche, insieme al pagamento.
            </p>
          </div>
        ) : null}

        {righeRidotte.length > 0 ? (
          <div className="space-y-2 rounded-md border border-amber-400 bg-amber-50 p-3 text-sm dark:border-amber-700 dark:bg-amber-950/40">
            <p className="flex items-start gap-2 font-medium text-amber-900 dark:text-amber-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {righeRidotte.length === 1
                ? "Stai incassando meno del dovuto su questa scadenza:"
                : "Stai incassando meno del dovuto su queste scadenze:"}
            </p>
            <ul className="space-y-1 pl-6 text-amber-900 dark:text-amber-100">
              {righeRidotte.map((r) => (
                <li key={r.id}>
                  <strong>{r.description}</strong>: passa da{" "}
                  <span className="font-mono tabular-nums">
                    {formatEur(r.fromCents)}
                  </span>{" "}
                  a{" "}
                  <span className="font-mono tabular-nums">
                    {formatEur(r.toCents)}
                  </span>{" "}
                  e risulta <strong>pagata</strong>, senza residuo.
                </li>
              ))}
            </ul>
            <p className="pl-6 text-xs text-amber-800 dark:text-amber-200">
              Controlla che sia il mese giusto. Per rimetterla a posto dopo
              serve &laquo;Modifica importo&raquo; sulla scadenza.
            </p>
          </div>
        ) : null}

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
