"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
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
import { toDateInputValue } from "@/lib/utils/format"

import { createAcademicYear, updateAcademicYear } from "../actions"

type Mode = "create" | "edit"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: Mode
  yearId?: string
  defaults?: Partial<AcademicYearValues>
}

export function AcademicYearFormDialog({
  open,
  onOpenChange,
  mode,
  yearId,
  defaults,
}: Props) {
  const [busy, setBusy] = React.useState(false)

  const form = useForm<AcademicYearValues>({
    resolver: zodResolver(academicYearSchema),
    defaultValues: {
      label: defaults?.label ?? "",
      startDate: defaults?.startDate ?? new Date(new Date().getFullYear(), 8, 1),
      endDate: defaults?.endDate ?? new Date(new Date().getFullYear() + 1, 7, 31),
      associationFeeEur: defaults?.associationFeeEur ?? 0,
      monthlyRenewalDay: defaults?.monthlyRenewalDay ?? 10,
    },
  })

  React.useEffect(() => {
    if (open) {
      form.reset({
        label: defaults?.label ?? "",
        startDate:
          defaults?.startDate ?? new Date(new Date().getFullYear(), 8, 1),
        endDate:
          defaults?.endDate ??
          new Date(new Date().getFullYear() + 1, 7, 31),
        associationFeeEur: defaults?.associationFeeEur ?? 0,
        monthlyRenewalDay: defaults?.monthlyRenewalDay ?? 10,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, yearId])

  async function onSubmit(values: AcademicYearValues) {
    setBusy(true)
    const result =
      mode === "create"
        ? await createAcademicYear(values)
        : await updateAcademicYear(yearId!, values)
    if (result.ok) {
      toast.success(mode === "create" ? "Anno creato" : "Anno aggiornato")
      onOpenChange(false)
    } else {
      toast.error(result.error)
    }
    setBusy(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create"
              ? "Nuovo anno accademico"
              : "Modifica anno accademico"}
          </DialogTitle>
          <DialogDescription>
            Periodo da settembre a giugno/agosto. Quota associativa annuale e
            giorno di scadenza mensile.
          </DialogDescription>
        </DialogHeader>
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
                  <FormLabel>Anno accademico</FormLabel>
                  <FormControl>
                    <Input placeholder="es. 2025-2026" {...field} />
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
                          field.value ? toDateInputValue(field.value) : ""
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
                          field.value ? toDateInputValue(field.value) : ""
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

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="associationFeeEur"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quota associativa (€)</FormLabel>
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
              <FormField
                control={form.control}
                name="monthlyRenewalDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Giorno scadenza mensile (31 → ultimo del mese)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={31}
                        value={field.value ?? ""}
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
            </div>

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
                    Salvataggio...
                  </>
                ) : mode === "create" ? (
                  "Crea anno"
                ) : (
                  "Salva"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
