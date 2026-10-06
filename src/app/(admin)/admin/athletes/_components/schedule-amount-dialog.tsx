"use client"

import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, RotateCcw } from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
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
import { Textarea } from "@/components/ui/textarea"
import {
  scheduleAmountSchema,
  type ScheduleAmountValues,
} from "@/lib/schemas/payment-schedule"
import { formatDateShort, formatEuro } from "@/lib/utils/format"

import { updateScheduleAmount } from "../schedules-actions"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  schedule: {
    id: string
    courseName: string
    dueDate: Date
    amountCents: number
  }
  // Importo "di listino" con cui confrontare: la quota mensile del corso, o il
  // contributo di iscrizione dell'anno. null quando non c'è un riferimento
  // (stage, saggio, costume: il prezzo è dell'evento).
  reference: { amountCents: number; label: string } | null
  onSuccess?: () => void
}

export function ScheduleAmountDialog({
  open,
  onOpenChange,
  schedule,
  reference,
  onSuccess,
}: Props) {
  const [isPending, startTransition] = useTransition()

  const form = useForm<ScheduleAmountValues>({
    resolver: zodResolver(scheduleAmountSchema),
    defaultValues: {
      amountEur: schedule.amountCents / 100,
      reason: "",
    },
  })

  // Il caso più comune è proprio questo: una scadenza rimasta all'importo
  // ridotto di un incasso poi annullato. Un tocco e torna a posto.
  const disallineata =
    reference !== null && reference.amountCents !== schedule.amountCents

  function riallinea() {
    if (!reference) return
    form.setValue("amountEur", reference.amountCents / 100, {
      shouldValidate: true,
    })
    if (form.getValues("reason").trim().length === 0) {
      form.setValue("reason", `Riportato alla ${reference.label}`, {
        shouldValidate: true,
      })
    }
  }

  function onSubmit(values: ScheduleAmountValues) {
    startTransition(async () => {
      const result = await updateScheduleAmount(schedule.id, values)
      if (result.ok) {
        toast.success(
          `Importo aggiornato a ${formatEuro(result.data?.amountCents ?? 0)}`,
        )
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
          <AlertDialogTitle>Modifica importo</AlertDialogTitle>
          <AlertDialogDescription>
            {schedule.courseName} · scadenza{" "}
            {formatDateShort(new Date(schedule.dueDate))} · ora{" "}
            {formatEuro(schedule.amountCents)}
            {disallineata && reference ? (
              <>
                {" "}
                — la {reference.label} è{" "}
                {formatEuro(reference.amountCents)}.
              </>
            ) : null}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Form {...form}>
          <form
            id="schedule-amount-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            {disallineata && reference ? (
              <Button
                type="button"
                variant="outline"
                onClick={riallinea}
                disabled={isPending}
                className="w-full min-h-11"
              >
                <RotateCcw className="h-4 w-4" />
                Riporta a {formatEuro(reference.amountCents)}
              </Button>
            ) : null}

            <FormField
              control={form.control}
              name="amountEur"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Importo</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      inputMode="decimal"
                      value={Number.isFinite(field.value) ? field.value : ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === ""
                            ? undefined
                            : Number(e.target.value),
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
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={2}
                      placeholder="es. incasso ridotto annullato, importo da riportare alla quota"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Resta scritto nel registro delle modifiche, con l&apos;importo
                    di prima e quello nuovo.
                  </FormDescription>
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
            form="schedule-amount-form"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvataggio…
              </>
            ) : (
              "Salva importo"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
