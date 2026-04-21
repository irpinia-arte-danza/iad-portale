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

const NONE_TEACHER = "__none__"

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
          name="teacherId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Insegnante</FormLabel>
              <Select
                value={field.value && field.value !== "" ? field.value : NONE_TEACHER}
                onValueChange={(v) =>
                  field.onChange(v === NONE_TEACHER ? "" : v)
                }
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona insegnante" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={NONE_TEACHER}>Nessuno</SelectItem>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.lastName} {t.firstName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
