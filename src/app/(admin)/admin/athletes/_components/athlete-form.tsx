"use client"

import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Gender } from "@prisma/client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormDescription,
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
import { Separator } from "@/components/ui/separator"
import { AnagraficaCompletaSection } from "@/components/forms/anagrafica-completa-section"
import {
  athleteCreateSchema,
  genderOptions,
  type AthleteCreateValues,
} from "@/lib/schemas/athlete"

import { createAthlete, updateAthlete } from "../actions"

interface AthleteFormProps {
  mode: "create" | "edit"
  defaultValues?: Partial<AthleteCreateValues>
  athleteId?: string
  onSuccess?: () => void
}

export function AthleteForm({
  mode,
  defaultValues,
  athleteId,
  onSuccess,
}: AthleteFormProps) {
  const [isPending, startTransition] = useTransition()

  const form = useForm<AthleteCreateValues>({
    resolver: zodResolver(athleteCreateSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      dateOfBirth: undefined as unknown as Date,
      gender: Gender.F,
      fiscalCode: "",
      placeOfBirth: "",
      provinceOfBirth: "",
      residenceStreet: "",
      residenceNumber: "",
      residenceCity: "",
      residenceProvince: "",
      residenceCap: "",
      instructorNotes: "",
      ...defaultValues,
    },
  })

  function onSubmit(values: AthleteCreateValues) {
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createAthlete(values)
          : await updateAthlete(athleteId!, values)

      if (result.ok) {
        toast.success(
          mode === "create" ? "Allieva aggiunta" : "Modifiche salvate"
        )
        if (mode === "create") form.reset()
        onSuccess?.()
      } else {
        toast.error(result.error)
      }
    })
  }

  const submitLabel =
    mode === "create" ? "Aggiungi allieva" : "Salva modifiche"

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

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="dateOfBirth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data di nascita</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    autoComplete="bday"
                    value={
                      field.value instanceof Date
                        ? field.value.toISOString().split("T")[0]
                        : (field.value ?? "")
                    }
                    onChange={(e) => {
                      const val = e.target.value
                      field.onChange(val ? new Date(val) : undefined)
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sesso</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {genderOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        <AnagraficaCompletaSection personLabel="allieva" />

        <Separator />

        <FormField
          control={form.control}
          name="instructorNotes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Note generali sull'allieva (opzionale)"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Note visibili solo allo staff. Non usare per dati medici
                (verranno gestiti separatamente).
              </FormDescription>
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
