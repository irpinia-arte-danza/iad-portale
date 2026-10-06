"use client"

import { useEffect, useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ChevronDown } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { useBeforeUnloadGuard } from "@/lib/hooks/use-dirty-form"
import { cn } from "@/lib/utils"
import {
  associationSchema,
  type AssociationValues,
} from "@/lib/schemas/admin-settings"

import { updateAssociation } from "../actions"
import { StickySaveBar } from "./sticky-save-bar"

interface AssociationTabProps {
  initial: AssociationValues
  onDirtyChange: (dirty: boolean) => void
}

function RequiredMark() {
  return <span className="text-destructive"> *</span>
}

export function AssociationTab({ initial, onDirtyChange }: AssociationTabProps) {
  const [isPending, startTransition] = useTransition()

  const form = useForm<AssociationValues>({
    resolver: zodResolver(associationSchema),
    defaultValues: initial,
    mode: "onBlur",
  })

  const isDirty = form.formState.isDirty
  useBeforeUnloadGuard(isDirty)

  useEffect(() => {
    onDirtyChange(isDirty)
  }, [isDirty, onDirtyChange])

  const gymSame = form.watch("gymSameAsLegal")

  // Dati fiscali facoltativi: chiusi di default. Un errore di validazione
  // lì dentro li apre da solo — un campo sbagliato che non si vede non si
  // corregge.
  const [fiscalOpen, setFiscalOpen] = useState(false)
  const { errors } = form.formState
  const fiscalHasError = Boolean(
    errors.asdVatNumber || errors.asdPec || errors.asdSdiCode,
  )
  const [vatValue, pecValue, sdiValue] = form.watch([
    "asdVatNumber",
    "asdPec",
    "asdSdiCode",
  ])
  const fiscalFilled = [vatValue, pecValue, sdiValue].some(
    (v) => typeof v === "string" && v.trim().length > 0,
  )

  function onSubmit(values: AssociationValues) {
    startTransition(async () => {
      const res = await updateAssociation(values)
      if (res.ok) {
        toast.success("Dati associazione aggiornati")
        form.reset(values)
      } else {
        toast.error(res.error)
      }
    })
  }

  function onInvalid() {
    toast.error("Controlla i campi segnalati")
  }

  function onDiscard() {
    form.reset(initial)
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit, onInvalid)}
        className="space-y-6"
      >
        <Card>
          <CardHeader>
            <CardTitle>Dati legali</CardTitle>
            <CardDescription>
              Denominazione, codici fiscali e contatti ufficiali dell&apos;ASD.
              Compaiono su ricevute, moduli e comunicazioni ufficiali.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="asdName"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>
                    Denominazione
                    <RequiredMark />
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="es. A.S.D. Nome Associazione"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="asdFiscalCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Codice fiscale
                    <RequiredMark />
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="11 cifre o 16 caratteri"
                      className="font-mono"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="asdEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Email ufficiale
                    <RequiredMark />
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="email@esempio.it"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="asdPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefono (opzionale)</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      inputMode="tel"
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
              name="asdWebsite"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sito web (opzionale)</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://www.esempio.it"
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
              name="asdIban"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>IBAN (opzionale)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      placeholder="IT00 X000 0000 0000 0000 0000 000"
                      className="font-mono"
                    />
                  </FormControl>
                  <FormDescription>
                    Mostrato in ricevute e comunicazioni per bonifici.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Partita IVA, PEC e SDI: una ASD senza attività commerciale non
                li ha, e in cima al modulo sembravano obbligatori. Chiusi di
                default; si aprono da soli se c'è un errore da correggere. */}
            <Collapsible
              open={fiscalOpen || fiscalHasError}
              onOpenChange={setFiscalOpen}
              className="sm:col-span-2"
            >
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 w-full justify-between px-2"
                >
                  <span>
                    Dati fiscali facoltativi
                    {fiscalFilled ? (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        compilati
                      </span>
                    ) : null}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      (fiscalOpen || fiscalHasError) && "rotate-180",
                    )}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="grid gap-4 pt-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="asdVatNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Partita IVA</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ""}
                          placeholder="11 cifre"
                          inputMode="numeric"
                          className="font-mono"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="asdPec"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PEC</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="email@pec.it"
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
                  name="asdSdiCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Codice SDI</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ""}
                          placeholder="7 caratteri alfanumerici"
                          className="font-mono"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sede legale</CardTitle>
            <CardDescription>
              Indirizzo dichiarato nello statuto. Usato nelle ricevute.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="addressStreet"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>
                    Via e numero civico
                    <RequiredMark />
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      placeholder="es. Via Roma, 1"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="addressZip"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    CAP
                    <RequiredMark />
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      inputMode="numeric"
                      className="font-mono"
                      maxLength={5}
                      placeholder="00000"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="addressCity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Città
                    <RequiredMark />
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      placeholder="Nome città"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="addressProvince"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Provincia (sigla)
                    <RequiredMark />
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      maxLength={2}
                      className="font-mono uppercase"
                      placeholder="XX"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sede operativa (palestra)</CardTitle>
            <CardDescription>
              Se la palestra coincide con la sede legale lascia attivo
              l&apos;interruttore. Altrimenti specifica l&apos;indirizzo della sede
              didattica.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="gymSameAsLegal"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-4 rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Palestra = sede legale</FormLabel>
                    <FormDescription>
                      Disattiva per specificare un indirizzo diverso.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {!gymSame ? (
              <FormField
                control={form.control}
                name="gymAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Indirizzo palestra
                      <RequiredMark />
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        placeholder="es. Via Palestra, 10 — 00000 Città (XX)"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}
          </CardContent>
        </Card>

        <StickySaveBar
          visible={isDirty}
          submitting={isPending}
          onSave={form.handleSubmit(onSubmit, onInvalid)}
          onDiscard={onDiscard}
        />

        <noscript>
          <Button type="submit">Salva</Button>
        </noscript>
      </form>
    </Form>
  )
}
