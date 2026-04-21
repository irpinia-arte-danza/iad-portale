"use client"

import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { createParent, updateParent } from "../actions"
import {
  parentCreateSchema,
  type ParentCreateValues,
} from "@/lib/schemas/parent"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"
import { AnagraficaCompletaSection } from "@/components/forms/anagrafica-completa-section"

interface ParentFormProps {
  mode: "create" | "edit"
  defaultValues?: Partial<ParentCreateValues>
  parentId?: string
  onSuccess?: () => void
}

export function ParentForm({
  mode,
  defaultValues,
  parentId,
  onSuccess,
}: ParentFormProps) {
  const [isPending, startTransition] = useTransition()

  const form = useForm<ParentCreateValues>({
    resolver: zodResolver(parentCreateSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      receivesEmailCommunications: true,
      remindersEnabled: true,
      dateOfBirth: undefined,
      fiscalCode: "",
      placeOfBirth: "",
      provinceOfBirth: "",
      residenceStreet: "",
      residenceNumber: "",
      residenceCity: "",
      residenceProvince: "",
      residenceCap: "",
      ...defaultValues,
    },
  })

  function onSubmit(values: ParentCreateValues) {
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createParent(values)
          : await updateParent(parentId!, values)

      if (result.ok) {
        toast.success(
          mode === "create" ? "Genitore aggiunto" : "Modifiche salvate"
        )
        if (mode === "create") form.reset()
        onSuccess?.()
      } else {
        toast.error(result.error)
      }
    })
  }

  const submitLabel =
    mode === "create" ? "Aggiungi genitore" : "Salva modifiche"

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
              <FormLabel>Email *</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  {...field}
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
              <FormLabel>Telefono *</FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+39 333 1234567"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Separator />

        <AnagraficaCompletaSection personLabel="genitore" showDateOfBirth />

        <Separator />

        <div className="space-y-4">
          <h3 className="text-sm font-medium">Preferenze</h3>

          <FormField
            control={form.control}
            name="receivesEmailCommunications"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start gap-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="cursor-pointer">
                    Riceve comunicazioni email
                  </FormLabel>
                  <FormDescription>
                    Broadcast e avvisi generali dall&apos;associazione.
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="remindersEnabled"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start gap-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="cursor-pointer">
                    Riceve solleciti pagamento
                  </FormLabel>
                  <FormDescription>
                    Email automatiche per quote in scadenza o in ritardo.
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
        </div>

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
