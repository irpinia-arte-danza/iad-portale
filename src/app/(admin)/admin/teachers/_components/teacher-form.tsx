"use client"

import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import {
  teacherCreateSchema,
  type TeacherCreateValues,
} from "@/lib/schemas/teacher"
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

import { createTeacher, updateTeacher } from "../actions"

interface TeacherFormProps {
  mode: "create" | "edit"
  defaultValues?: Partial<TeacherCreateValues>
  teacherId?: string
  onSuccess?: () => void
}

export function TeacherForm({
  mode,
  defaultValues,
  teacherId,
  onSuccess,
}: TeacherFormProps) {
  const [isPending, startTransition] = useTransition()

  const form = useForm<TeacherCreateValues>({
    resolver: zodResolver(teacherCreateSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      fiscalCode: "",
      qualifications: "",
      ...defaultValues,
    },
  })

  function onSubmit(values: TeacherCreateValues) {
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createTeacher(values)
          : await updateTeacher(teacherId!, values)

      if (result.ok) {
        toast.success(
          mode === "create" ? "Insegnante aggiunto" : "Modifiche salvate",
        )
        if (mode === "create") form.reset()
        onSuccess?.()
      } else {
        toast.error(result.error)
      }
    })
  }

  const submitLabel =
    mode === "create" ? "Aggiungi insegnante" : "Salva modifiche"

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome</FormLabel>
                <FormControl>
                  <Input autoComplete="given-name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cognome</FormLabel>
                <FormControl>
                  <Input autoComplete="family-name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
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
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telefono</FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="es. +39 333 1234567"
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
          name="fiscalCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Codice fiscale</FormLabel>
              <FormControl>
                <Input
                  placeholder="16 caratteri alfanumerici"
                  autoComplete="off"
                  className="uppercase"
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
          name="qualifications"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Qualifiche / Specialità</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Es. Danza Classica, Danza Moderna, Propedeutica"
                  rows={3}
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
