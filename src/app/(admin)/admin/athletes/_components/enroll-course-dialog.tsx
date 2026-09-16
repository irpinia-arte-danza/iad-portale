"use client"

import { useState, useTransition } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { AlertTriangle, Loader2, Plus } from "lucide-react"
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

import { enrollmentPreview } from "@/lib/fees/enrollment-preview"
import {
  enrollmentCreateSchema,
  type EnrollmentCreateValues,
} from "@/lib/schemas/enrollment"
import { COURSE_TYPE_LABELS } from "@/lib/schemas/course"
import { toDateOnly, todayDateOnly } from "@/lib/utils/date-only"
import { formatDateShort, formatEur, formatMeseIt } from "@/lib/utils/format"

import { createEnrollment } from "../enrollments-actions"

type ActiveCourse = {
  id: string
  name: string
  type: keyof typeof COURSE_TYPE_LABELS
  monthlyFeeCents: number
}

// Anno accademico corrente: serve all'anteprima di rate e quota associativa
export type EnrollmentAcademicYear = {
  label: string
  startDate: Date
  monthlyRenewalDay: number
  associationFeeCents: number
}

interface EnrollCourseDialogProps {
  athleteId: string
  activeCourses: ActiveCourse[]
  currentAcademicYear: EnrollmentAcademicYear | null
  // L'allieva ha già la quota associativa dell'anno corrente
  hasAssociationFee: boolean
  enrolledCourseIds: string[]
}

function toDateInputValue(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function monthName(date: Date): string {
  return formatMeseIt(date).toLowerCase()
}

export function EnrollCourseDialog({
  athleteId,
  activeCourses,
  currentAcademicYear,
  hasAssociationFee,
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
  const watchedCourseId = useWatch({ control: form.control, name: "courseId" })
  const watchedDate = useWatch({ control: form.control, name: "enrollmentDate" })

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
  const noAcademicYear = !currentAcademicYear
  const noCoursesAvailable = availableCourses.length === 0

  // Anteprima di cosa genera l'iscrizione, con le stesse regole del server
  const selectedCourse =
    availableCourses.find((c) => c.id === watchedCourseId) ?? null
  const validDate =
    watchedDate instanceof Date && !Number.isNaN(watchedDate.getTime())
      ? toDateOnly(watchedDate)
      : null
  const preview =
    selectedCourse && validDate && currentAcademicYear
      ? enrollmentPreview({
          enrollmentDate: validDate,
          monthlyFeeCents: selectedCourse.monthlyFeeCents,
          academicYear: currentAcademicYear,
          hasAssociationFee,
        })
      : null
  const today = todayDateOnly()
  const yearSlash = currentAcademicYear?.label.replace("-", "/") ?? ""
  const associationNotSet = preview?.association.kind === "not-set"

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

        {currentAcademicYear && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Anno accademico:</span>
            <Badge variant="secondary">{currentAcademicYear.label}</Badge>
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
                            {c.name} · {formatEur(c.monthlyFeeCents)}/mese
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

              {preview && selectedCourse ? (
                <div
                  className="space-y-2 rounded-md border bg-muted/40 p-3 text-sm"
                  aria-live="polite"
                >
                  <p className="font-medium">Con questa iscrizione</p>

                  {preview.zeroFeeCourse ? (
                    <p className="flex gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-destructive">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        «{selectedCourse.name}» ha contributo mensile 0 €:
                        l&apos;iscrizione non genera nessuna rata. Se è un
                        errore, imposta prima il contributo del corso.
                      </span>
                    </p>
                  ) : preview.monthly ? (
                    <p>
                      <span className="font-mono tabular-nums">
                        {preview.monthly.count}
                      </span>{" "}
                      {preview.monthly.count === 1
                        ? "rata mensile"
                        : "rate mensili"}{" "}
                      da{" "}
                      <span className="font-mono tabular-nums">
                        {formatEur(preview.monthly.amountCents)}
                      </span>
                      {preview.monthly.count === 1
                        ? `, ${monthName(preview.monthly.firstDueDate)}`
                        : `, da ${monthName(preview.monthly.firstDueDate)} a ${monthName(preview.monthly.lastDueDate)}`}
                      <span className="block text-xs text-muted-foreground">
                        Prima scadenza{" "}
                        {formatDateShort(preview.monthly.firstDueDate)}
                        {preview.monthly.firstDueDate.getTime() < today.getTime()
                          ? " — già in ritardo"
                          : ""}
                        . L&apos;importo ridotto si registra all&apos;incasso.
                      </span>
                    </p>
                  ) : (
                    <p className="flex gap-2 text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        Nessuna rata mensile: la data è dopo la fine dei corsi
                        (giugno).
                      </span>
                    </p>
                  )}

                  {preview.association.kind === "new" ? (
                    <p>
                      Contributo di iscrizione {yearSlash}:{" "}
                      <span className="font-mono tabular-nums">
                        {formatEur(preview.association.amountCents)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {" "}
                        · scadenza {formatDateShort(preview.association.dueDate)}
                      </span>
                    </p>
                  ) : preview.association.kind === "existing" ? (
                    <p className="text-muted-foreground">
                      Contributo di iscrizione {yearSlash}: già presente.
                    </p>
                  ) : (
                    <p className="flex gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-destructive">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        Contributo di iscrizione {yearSlash} non impostato:
                        l&apos;iscrizione verrebbe rifiutata. Impostalo in Anni
                        accademici.
                      </span>
                    </p>
                  )}
                </div>
              ) : null}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                  disabled={isPending}
                >
                  Annulla
                </Button>
                <Button type="submit" disabled={isPending || associationNotSet}>
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Iscrizione...
                    </>
                  ) : preview?.zeroFeeCourse ? (
                    "Iscrivi senza rate"
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
