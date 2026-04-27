"use client"

import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import {
  courseCreateSchema,
  type CourseCreateValues,
  COURSE_TYPES,
  COURSE_TYPE_LABELS,
} from "@/lib/schemas/course"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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

import { createCourse, updateCourse } from "../actions"

type TeacherOption = {
  id: string
  firstName: string
  lastName: string
}

interface CourseFormProps {
  mode: "create" | "edit"
  defaultValues?: Partial<CourseCreateValues>
  courseId?: string
  teachers: TeacherOption[]
  onSuccess?: () => void
}

export function CourseForm({
  mode,
  defaultValues,
  courseId,
  teachers,
  onSuccess,
}: CourseFormProps) {
  const [isPending, startTransition] = useTransition()

  const form = useForm<CourseCreateValues>({
    resolver: zodResolver(courseCreateSchema),
    defaultValues: {
      name: "",
      type: "GIOCO_DANZA",
      description: "",
      minAge: undefined,
      maxAge: undefined,
      level: "",
      capacity: 20,
      monthlyFeeEur: 0,
      trimesterFeeEur: undefined,
      teachers: [],
      teacherId: "",
      ...defaultValues,
    },
  })

  function onSubmit(values: CourseCreateValues) {
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createCourse(values)
          : await updateCourse(courseId!, values)

      if (result.ok) {
        toast.success(
          mode === "create" ? "Corso aggiunto" : "Modifiche salvate",
        )
        if (mode === "create") form.reset()
        onSuccess?.()
      } else {
        toast.error(result.error)
      }
    })
  }

  const submitLabel = mode === "create" ? "Aggiungi corso" : "Salva modifiche"

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome</FormLabel>
                <FormControl>
                  <Input placeholder="Es. Danza Classica" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {COURSE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {COURSE_TYPE_LABELS[t]}
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
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrizione</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Descrizione breve del corso"
                  rows={2}
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField
            control={form.control}
            name="minAge"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Età min</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={2}
                    max={99}
                    placeholder="—"
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
          <FormField
            control={form.control}
            name="maxAge"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Età max</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={2}
                    max={99}
                    placeholder="—"
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
          <FormField
            control={form.control}
            name="level"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Livello</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Es. Base, Intermedio"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
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
                    max={999}
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value === "" ? 0 : Number(e.target.value),
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
            name="monthlyFeeEur"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quota mensile (€)</FormLabel>
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
                        e.target.value === "" ? 0 : Number(e.target.value),
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
            name="trimesterFeeEur"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quota trim. (€)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step={0.5}
                    min={0}
                    max={3000}
                    placeholder="—"
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

        <FormField
          control={form.control}
          name="teachers"
          render={({ field }) => {
            const selected = field.value ?? []
            const selectedIds = new Set(selected.map((t) => t.teacherId))
            const ensurePrimary = (
              list: { teacherId: string; isPrimary: boolean }[],
            ) => {
              if (list.length === 0) return list
              if (list.some((t) => t.isPrimary)) return list
              return list.map((t, i) =>
                i === 0 ? { ...t, isPrimary: true } : t,
              )
            }

            const toggleTeacher = (teacherId: string, checked: boolean) => {
              if (checked) {
                if (selectedIds.has(teacherId)) return
                const next = ensurePrimary([
                  ...selected,
                  { teacherId, isPrimary: selected.length === 0 },
                ])
                field.onChange(next)
              } else {
                const next = ensurePrimary(
                  selected.filter((t) => t.teacherId !== teacherId),
                )
                field.onChange(next)
              }
            }

            const setPrimary = (teacherId: string) => {
              field.onChange(
                selected.map((t) => ({
                  ...t,
                  isPrimary: t.teacherId === teacherId,
                })),
              )
            }

            return (
              <FormItem>
                <FormLabel>Insegnanti</FormLabel>
                {teachers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nessun insegnante disponibile. Aggiungili da{" "}
                    <em>Insegnanti</em>.
                  </p>
                ) : (
                  <div className="space-y-2 rounded-md border p-3">
                    {teachers.map((t) => {
                      const isSelected = selectedIds.has(t.id)
                      const link = selected.find((s) => s.teacherId === t.id)
                      return (
                        <div
                          key={t.id}
                          className="flex items-center gap-3 text-sm"
                        >
                          <Checkbox
                            id={`teacher-${t.id}`}
                            checked={isSelected}
                            onCheckedChange={(c) =>
                              toggleTeacher(t.id, c === true)
                            }
                          />
                          <label
                            htmlFor={`teacher-${t.id}`}
                            className="flex-1 cursor-pointer"
                          >
                            {t.lastName} {t.firstName}
                          </label>
                          {selected.length > 1 ? (
                            <label className="flex items-center gap-1 text-xs text-muted-foreground">
                              <input
                                type="radio"
                                name="primary-teacher"
                                checked={!!link?.isPrimary}
                                onChange={() => setPrimary(t.id)}
                                disabled={!isSelected}
                                className="h-4 w-4"
                              />
                              Principale
                            </label>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )
          }}
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
                Salvataggio...
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}
