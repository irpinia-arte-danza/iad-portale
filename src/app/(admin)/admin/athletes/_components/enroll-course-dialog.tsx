"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Plus } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Textarea } from "@/components/ui/textarea"

import {
  enrollmentCreateSchema,
  type EnrollmentCreateValues,
} from "@/lib/schemas/enrollment"
import { COURSE_TYPE_LABELS } from "@/lib/schemas/course"

import { createEnrollment } from "../enrollments-actions"

type ActiveCourse = {
  id: string
  name: string
  type: keyof typeof COURSE_TYPE_LABELS
  monthlyFeeCents: number
}

interface EnrollCourseDialogProps {
  athleteId: string
  activeCourses: ActiveCourse[]
  currentAcademicYearLabel: string | null
  enrolledCourseIds: string[]
}

const euroFormatter = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
})

function toDateInputValue(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function EnrollCourseDialog({
  athleteId,
  activeCourses,
  currentAcademicYearLabel,
  enrolledCourseIds,
}: EnrollCourseDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const form = useForm<EnrollmentCreateValues>({
    resolver: zodResolver(enrollmentCreateSchema),
    defaultValues: {
      courseId: "",
      enrollmentDate: new Date(),
      notes: "",
    },
  })

  function onSubmit(values: EnrollmentCreateValues) {
    startTransition(async () => {
      const result = await createEnrollment(athleteId, values)
      if (result.ok) {
        toast.success("Iscrizione creata")
        form.reset()
        setOpen(false)
      } else {
        toast.error(result.error)
      }
    })
  }

  const availableCourses = activeCourses.filter(
    (c) => !enrolledCourseIds.includes(c.id),
  )
  const noAcademicYear = !currentAcademicYearLabel
  const noCoursesAvailable = availableCourses.length === 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={noAcademicYear}>
          <Plus className="h-4 w-4" />
          Iscrivi a corso
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Iscrivi a corso</DialogTitle>
          <DialogDescription>
            Collega l&apos;allieva a un corso attivo per l&apos;anno accademico
            corrente.
          </DialogDescription>
        </DialogHeader>

        {currentAcademicYearLabel && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Anno accademico:</span>
            <Badge variant="secondary">{currentAcademicYearLabel}</Badge>
          </div>
        )}

        {noCoursesAvailable ? (
          <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            Nessun corso attivo disponibile per l&apos;iscrizione.
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="courseId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Corso</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona corso" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableCourses.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name} ·{" "}
                            {euroFormatter.format(c.monthlyFeeCents / 100)}/mese
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
                name="enrollmentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data iscrizione</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        max={toDateInputValue(new Date())}
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
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note (opzionale)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Es. entra a febbraio, ripete propedeutica…"
                        rows={2}
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                  disabled={isPending}
                >
                  Annulla
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Iscrizione...
                    </>
                  ) : (
                    "Iscrivi"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}
