"use client"

import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import {
  EXPENSE_TYPE_LABELS,
  expenseCreateSchema,
  type ExpenseCreateValues,
} from "@/lib/schemas/expense"
import { PAYMENT_METHOD_LABELS } from "@/lib/schemas/payment"
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

import { registerExpense, updateExpense } from "../actions"

interface ExpenseFormProps {
  mode?: "create" | "edit"
  expenseId?: string
  defaultValues?: Partial<ExpenseCreateValues>
  submitLabel?: string
  onSuccess?: () => void
}

const EXPENSE_TYPE_ORDER = [
  "RENT",
  "TAX_F24",
  "UTILITY",
  "COMPENSATION",
  "COSTUME_PURCHASE",
  "MATERIAL",
  "INSURANCE",
  "AFFILIATION",
  "OTHER",
] as const

const METHOD_ORDER = ["TRANSFER", "CASH", "POS", "SUMUP_LINK", "OTHER"] as const

function toDateInputValue(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function ExpenseForm({
  mode = "create",
  expenseId,
  defaultValues,
  submitLabel,
  onSuccess,
}: ExpenseFormProps) {
  const [isPending, startTransition] = useTransition()

  const form = useForm<ExpenseCreateValues>({
    resolver: zodResolver(expenseCreateSchema),
    defaultValues: {
      type: "RENT",
      method: "TRANSFER",
      amountEur: 0,
      expenseDate: new Date(),
      recipient: "",
      description: "",
      notes: "",
      ...defaultValues,
    },
  })

  function onSubmit(values: ExpenseCreateValues) {
    startTransition(async () => {
      const result =
        mode === "edit" && expenseId
          ? await updateExpense(expenseId, values)
          : await registerExpense(values)

      if (result.ok) {
        toast.success(
          mode === "edit" ? "Spesa aggiornata" : "Spesa registrata",
        )
        if (mode === "create") form.reset()
        onSuccess?.()
      } else {
        toast.error(result.error)
      }
    })
  }

  const defaultSubmitLabel =
    mode === "edit" ? "Salva modifiche" : "Registra spesa"
  const pendingLabel = mode === "edit" ? "Salvataggio…" : "Registrazione…"

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo spesa</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {EXPENSE_TYPE_ORDER.map((type) => (
                      <SelectItem key={type} value={type}>
                        {EXPENSE_TYPE_LABELS[type]}
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

        <FormField
          control={form.control}
          name="recipient"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fornitore / beneficiario (opzionale)</FormLabel>
              <FormControl>
                <Input
                  placeholder="es. Nome fornitore o beneficiario"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
            name="expenseDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data spesa</FormLabel>
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

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Causale</FormLabel>
              <FormControl>
                <Input
                  placeholder="Es. Affitto marzo 2026"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note (opzionale)</FormLabel>
              <FormControl>
                <Textarea
                  rows={2}
                  placeholder="Dettagli aggiuntivi opzionali"
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
                {pendingLabel}
              </>
            ) : (
              submitLabel ?? defaultSubmitLabel
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}
