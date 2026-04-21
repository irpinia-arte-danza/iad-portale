"use client"

import { useMemo, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import {
  FEE_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  paymentCreateSchema,
  type PaymentCreateValues,
} from "@/lib/schemas/payment"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
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
import type { AthleteWithFormRelations } from "../queries"

interface PaymentFormProps {
  athletes: AthleteWithFormRelations[]
  defaultValues?: Partial<PaymentCreateValues>
  onSuccess?: () => void
}

const FEE_TYPE_ORDER = [
  "MONTHLY",
  "TRIMESTER",
  "ASSOCIATION",
  "STAGE",
  "SHOWCASE_1",
  "SHOWCASE_2",
  "COSTUME",
  "TRIAL_LESSON",
  "OTHER",
] as const

const METHOD_ORDER = ["CASH", "TRANSFER", "POS", "SUMUP_LINK", "OTHER"] as const

function toDateInputValue(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function centsToEur(cents: number): string {
  return (cents / 100).toFixed(2)
}

export function PaymentForm({
  athletes,
  defaultValues,
  onSuccess,
}: PaymentFormProps) {
  const [isPending, startTransition] = useTransition()

  const form = useForm<PaymentCreateValues>({
    resolver: zodResolver(paymentCreateSchema),
    defaultValues: {
      athleteId: "",
      parentId: "",
      courseEnrollmentId: "",
      feeType: "MONTHLY",
      method: "CASH",
      amountEur: 0,
      paymentDate: new Date(),
      periodStart: undefined,
      periodEnd: undefined,
      notes: "",
      ...defaultValues,
    },
  })

  const watchedAthleteId = form.watch("athleteId")
  const watchedFeeType = form.watch("feeType")

  const selectedAthlete = useMemo(
    () => athletes.find((a) => a.id === watchedAthleteId),
    [athletes, watchedAthleteId],
  )

  const needsEnrollmentLink =
    watchedFeeType === "MONTHLY" || watchedFeeType === "TRIMESTER"

  function onSubmit(values: PaymentCreateValues) {
    startTransition(async () => {
      const result = await registerPayment(values)
      if (result.ok) {
        toast.success("Pagamento registrato")
        form.reset()
        onSuccess?.()
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
                  form.setValue("courseEnrollmentId", "")
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

        <div className="grid gap-4 sm:grid-cols-2">
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

        {needsEnrollmentLink && selectedAthlete && (
          <FormField
            control={form.control}
            name="courseEnrollmentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Corso (iscrizione collegata)</FormLabel>
                <Select
                  value={field.value || "__none__"}
                  onValueChange={(value) => {
                    const nextId = value === "__none__" ? "" : value
                    field.onChange(nextId)
                    const enrollment = selectedAthlete.enrollments.find(
                      (e) => e.id === nextId,
                    )
                    if (enrollment && form.getValues("amountEur") === 0) {
                      form.setValue(
                        "amountEur",
                        Number(centsToEur(enrollment.course.monthlyFeeCents)),
                      )
                    }
                  }}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Nessuno (pagamento libero)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="__none__">Nessuno</SelectItem>
                    {selectedAthlete.enrollments.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.course.name} — €
                        {centsToEur(e.course.monthlyFeeCents)}/mese
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="amountEur"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Importo (€)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={field.value === 0 ? "" : field.value}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value === ""
                          ? 0
                          : parseFloat(e.target.value),
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

        {needsEnrollmentLink && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="periodStart"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Periodo: inizio</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
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
            <FormField
              control={form.control}
              name="periodEnd"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Periodo: fine</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
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
                  placeholder="Note interne sul pagamento…"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex sm:justify-end">
          <Button
            type="submit"
            disabled={isPending}
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
