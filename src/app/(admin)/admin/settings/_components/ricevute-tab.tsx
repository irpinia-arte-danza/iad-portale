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
import { Textarea } from "@/components/ui/textarea"
import { useBeforeUnloadGuard } from "@/lib/hooks/use-dirty-form"
import {
  ricevuteSchema,
  type RicevuteValues,
} from "@/lib/schemas/admin-settings"

import { updateRicevute } from "../actions"
import { StickySaveBar } from "./sticky-save-bar"

interface RicevuteTabProps {
  initial: RicevuteValues
  onDirtyChange: (dirty: boolean) => void
}

export function RicevuteTab({ initial, onDirtyChange }: RicevuteTabProps) {
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
              Prefisso e contatore usati per generare il numero di ricevuta.
              Esempio:{" "}
              <span className="font-mono">
                {prefix || "IAD/"}2025-26/
                {String((counter ?? 0) + 1).padStart(3, "0")}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
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
                  <FormLabel>Contatore ultima ricevuta emessa</FormLabel>
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
                    Il prossimo numero sarà{" "}
                    <span className="font-mono">
                      {String((field.value ?? 0) + 1).padStart(3, "0")}
                    </span>
                    . Modifica solo se stai importando ricevute esistenti.
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
