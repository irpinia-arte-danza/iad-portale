"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import {
  stageCreateSchema,
  type StageCreateValues,
} from "@/lib/schemas/stage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

import { createStage, updateStage } from "../actions"

type StageFormProps = {
  mode?: "create" | "edit"
  stageId?: string
  defaultValues?: Partial<StageCreateValues>
  onSuccess?: () => void
}

function toDateInputValue(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function StageForm({
  mode = "create",
  stageId,
  defaultValues,
  onSuccess,
}: StageFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const form = useForm<StageCreateValues>({
    resolver: zodResolver(stageCreateSchema),
    defaultValues: {
      title: "",
      description: "",
      date: undefined as unknown as Date,
      startTime: "10:00",
      endTime: "12:00",
      location: "",
      capacity: 20,
      feeEur: 30,
      registrationOpen: true,
      registrationDeadline: null,
      ...defaultValues,
    },
  })

  function onSubmit(values: StageCreateValues) {
    startTransition(async () => {
      const result =
        mode === "edit" && stageId
          ? await updateStage(stageId, values)
          : await createStage(values)

      if (result.ok) {
        toast.success(mode === "edit" ? "Stage aggiornato" : "Stage creato")
        if (mode === "create" && "data" in result && result.data) {
          router.push(`/admin/stages/${result.data.id}`)
        } else if (mode === "edit") {
          router.refresh()
        }
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
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Titolo</FormLabel>
              <FormControl>
                <Input
                  placeholder="es. Workshop hip-hop con Maria Bianchi"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrizione (opzionale)</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder="Dettagli evento, programma, docente ospite…"
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
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data stage</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    value={field.value ? toDateInputValue(field.value) : ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? new Date(e.target.value) : undefined,
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
            name="registrationDeadline"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Scadenza iscrizioni (opzionale)</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    value={field.value ? toDateInputValue(field.value) : ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? new Date(e.target.value) : null,
                      )
                    }
                  />
                </FormControl>
                <FormDescription>
                  Se assente, vale la data dello stage.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Orario inizio</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Orario fine</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Luogo</FormLabel>
              <FormControl>
                <Input
                  placeholder="es. Palestra IAD, Montella"
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
            name="capacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Capienza</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={field.value === 0 ? "" : field.value}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value === ""
                          ? 0
                          : parseInt(e.target.value, 10),
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
            name="feeEur"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quota (€)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
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
        </div>

        <FormField
          control={form.control}
          name="registrationOpen"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Iscrizioni aperte</FormLabel>
                <FormDescription>
                  Se disattivato, lo stage è visibile ma chiuso ad iscrizioni.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
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
                Salvataggio…
              </>
            ) : mode === "edit" ? (
              "Salva modifiche"
            ) : (
              "Crea stage"
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}
