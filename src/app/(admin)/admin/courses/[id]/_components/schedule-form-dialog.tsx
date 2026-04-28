"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  courseScheduleSchema,
  DAY_OF_WEEK_LABELS,
  type CourseScheduleValues,
} from "@/lib/schemas/course-schedule"
import { toDateInputValue } from "@/lib/utils/format"

import {
  createSchedule,
  updateSchedule,
} from "../schedule-actions"

type Mode = "create" | "edit"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: Mode
  courseId: string
  scheduleId?: string
  defaults?: Partial<CourseScheduleValues>
}

export function ScheduleFormDialog({
  open,
  onOpenChange,
  mode,
  courseId,
  scheduleId,
  defaults,
}: Props) {
  const today = new Date()
  const [busy, setBusy] = React.useState(false)
  const [endOfYear, setEndOfYear] = React.useState(
    defaults?.validTo == null && mode === "create",
  )

  const form = useForm<CourseScheduleValues>({
    resolver: zodResolver(courseScheduleSchema),
    defaultValues: {
      courseId,
      dayOfWeek: defaults?.dayOfWeek ?? 1,
      startTime: defaults?.startTime ?? "17:00",
      endTime: defaults?.endTime ?? "18:00",
      location: defaults?.location ?? "",
      validFrom: defaults?.validFrom ?? today,
      validTo: defaults?.validTo ?? null,
    },
  })

  // Reset form quando il dialog si riapre con defaults diversi (edit row diversa)
  React.useEffect(() => {
    if (open) {
      form.reset({
        courseId,
        dayOfWeek: defaults?.dayOfWeek ?? 1,
        startTime: defaults?.startTime ?? "17:00",
        endTime: defaults?.endTime ?? "18:00",
        location: defaults?.location ?? "",
        validFrom: defaults?.validFrom ?? today,
        validTo: defaults?.validTo ?? null,
      })
      setEndOfYear(defaults?.validTo == null && mode === "create")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, scheduleId])

  async function onSubmit(values: CourseScheduleValues) {
    setBusy(true)
    const payload: CourseScheduleValues = {
      ...values,
      validTo: endOfYear ? null : values.validTo,
    }
    const result =
      mode === "create"
        ? await createSchedule(payload)
        : await updateSchedule(scheduleId!, payload)

    if (result.ok) {
      toast.success(
        mode === "create" ? "Orario aggiunto" : "Orario aggiornato",
      )
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
            {mode === "create" ? "Nuovo orario" : "Modifica orario"}
          </DialogTitle>
          <DialogDescription>
            Seleziona giorno, fascia oraria e periodo di validità.
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
              name="dayOfWeek"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Giorno</FormLabel>
                  <Select
                    value={String(field.value)}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DAY_OF_WEEK_LABELS.map((label, idx) => (
                        <SelectItem key={idx} value={String(idx)}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inizio</FormLabel>
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
                    <FormLabel>Fine</FormLabel>
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
                  <FormLabel>Luogo (opzionale)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="es. Sala A"
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
              name="validFrom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valido dal</FormLabel>
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

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={endOfYear}
                  onCheckedChange={(c) => setEndOfYear(c === true)}
                />
                <span>Fino a fine anno accademico</span>
              </label>

              {!endOfYear ? (
                <FormField
                  control={form.control}
                  name="validTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valido fino al</FormLabel>
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
                                : null,
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}
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
                  "Aggiungi"
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
