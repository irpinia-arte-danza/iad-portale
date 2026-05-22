"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import {
  showcaseCreateSchema,
  showcaseUpdateSchema,
  type ShowcaseCreateValues,
  type ShowcaseUpdateValues,
} from "@/lib/schemas/showcase"
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

import { createShowcase, updateShowcase } from "../actions"

type CreateProps = {
  mode: "create"
  showcaseId?: undefined
  academicYearId: string
  defaultValues?: Partial<ShowcaseCreateValues>
  onSuccess?: () => void
}

type EditProps = {
  mode: "edit"
  showcaseId: string
  academicYearId?: undefined
  defaultValues: ShowcaseUpdateValues
  onSuccess?: () => void
}

type ShowcaseFormProps = CreateProps | EditProps

function toDateInputValue(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function ShowcaseForm(props: ShowcaseFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  if (props.mode === "create") {
    return (
      <ShowcaseFormCreate
        academicYearId={props.academicYearId}
        defaultValues={props.defaultValues}
        onSuccess={props.onSuccess}
        router={router}
        isPending={isPending}
        startTransition={startTransition}
      />
    )
  }

  return (
    <ShowcaseFormEdit
      showcaseId={props.showcaseId}
      defaultValues={props.defaultValues}
      onSuccess={props.onSuccess}
      router={router}
      isPending={isPending}
      startTransition={startTransition}
    />
  )
}

type CreateInnerProps = {
  academicYearId: string
  defaultValues?: Partial<ShowcaseCreateValues>
  onSuccess?: () => void
  router: ReturnType<typeof useRouter>
  isPending: boolean
  startTransition: React.TransitionStartFunction
}

function ShowcaseFormCreate({
  academicYearId,
  defaultValues,
  onSuccess,
  router,
  isPending,
  startTransition,
}: CreateInnerProps) {
  const form = useForm<ShowcaseCreateValues>({
    resolver: zodResolver(showcaseCreateSchema),
    defaultValues: {
      academicYearId,
      title: "",
      description: "",
      date: undefined as unknown as Date,
      location: "",
      rehearsalDate: null,
      firstInstallmentEur: 50,
      secondInstallmentEur: 80,
      firstDeadline: undefined as unknown as Date,
      secondDeadline: undefined as unknown as Date,
      ...defaultValues,
    },
  })

  function onSubmit(values: ShowcaseCreateValues) {
    startTransition(async () => {
      const result = await createShowcase(values)
      if (result.ok) {
        toast.success("Saggio creato")
        if ("data" in result && result.data) {
          router.push(`/admin/showcase/${result.data.id}`)
        }
        onSuccess?.()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-5"
      >
        <ShowcaseFormFields form={form} />
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
            ) : (
              "Crea saggio"
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}

type EditInnerProps = {
  showcaseId: string
  defaultValues: ShowcaseUpdateValues
  onSuccess?: () => void
  router: ReturnType<typeof useRouter>
  isPending: boolean
  startTransition: React.TransitionStartFunction
}

function ShowcaseFormEdit({
  showcaseId,
  defaultValues,
  onSuccess,
  router,
  isPending,
  startTransition,
}: EditInnerProps) {
  const form = useForm<ShowcaseUpdateValues>({
    resolver: zodResolver(showcaseUpdateSchema),
    defaultValues,
  })

  function onSubmit(values: ShowcaseUpdateValues) {
    startTransition(async () => {
      const result = await updateShowcase(showcaseId, values)
      if (result.ok) {
        toast.success("Saggio aggiornato")
        router.refresh()
        onSuccess?.()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-5"
      >
        <ShowcaseFormFields form={form} />
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
            ) : (
              "Salva modifiche"
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}

type FormShape = {
  title: string
  description?: string | undefined
  date: Date
  location?: string | undefined
  rehearsalDate?: Date | null | undefined
  firstInstallmentEur: number
  secondInstallmentEur: number
  firstDeadline: Date
  secondDeadline: Date
}

function ShowcaseFormFields({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any
}) {
  return (
    <>
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Titolo</FormLabel>
            <FormControl>
              <Input
                placeholder="es. Saggio fine anno «In punta di piedi»"
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
                placeholder="Tema, ospiti, programma…"
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
              <FormLabel>Data saggio</FormLabel>
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
          name="rehearsalDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Prove generali (opzionale)</FormLabel>
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
                placeholder="es. Teatro Comunale, Avellino"
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
          name="firstInstallmentEur"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Caparra (€)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={field.value === 0 ? "" : field.value}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value === "" ? 0 : parseFloat(e.target.value),
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
          name="secondInstallmentEur"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Saldo (€)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={field.value === 0 ? "" : field.value}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value === "" ? 0 : parseFloat(e.target.value),
                    )
                  }
                />
              </FormControl>
              <FormDescription>
                Totale = Caparra + Saldo. In modalità «Quota unica» viene
                richiesta in un&apos;unica scadenza.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="firstDeadline"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Scadenza caparra</FormLabel>
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
          name="secondDeadline"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Scadenza saldo</FormLabel>
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
      </div>
    </>
  )
}
