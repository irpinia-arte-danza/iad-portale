"use client"

import { useState } from "react"
import { useFormContext, useWatch } from "react-hook-form"
import { AlertTriangle, ChevronDown, ChevronRight } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { athleteAccessEligibility } from "@/lib/auth/athlete-access"
import type { AthleteCreateValues } from "@/lib/schemas/athlete"

type Props = {
  // Genitori collegati e non nel cestino. In creazione è sempre 0: i genitori
  // si collegano dopo, dalla scheda dell'allieva.
  linkedParents: number
}

// Email e telefono dell'allieva.
//
// Per quasi tutte non servono: le comunicazioni vanno ai genitori, e due
// recapiti per la stessa famiglia sono solo un'occasione di scrivere a quello
// sbagliato. Per le maggiorenni senza genitori collegati — il corso adulti —
// sono invece l'unico recapito che la scuola ha.
//
// Da qui i due modi di mostrarli, decisi dalla stessa regola che decide se
// un'allieva può avere un accesso proprio (athleteAccessEligibility): chiusi
// e defilati nel caso normale, aperti e con l'avviso quando sono l'unica via.
export function AthleteContactFields({ linkedParents }: Props) {
  const [open, setOpen] = useState(false)
  const form = useFormContext<AthleteCreateValues>()

  // useWatch e non form.watch: form.watch non è memoizzabile e il lint di
  // react-hooks lo segnala
  const dateOfBirth = useWatch({ control: form.control, name: "dateOfBirth" })
  const email = useWatch({ control: form.control, name: "email" })

  const isOwnContact =
    dateOfBirth instanceof Date &&
    !Number.isNaN(dateOfBirth.getTime()) &&
    athleteAccessEligibility({ dateOfBirth, linkedParents }).ok

  // Impilati e non affiancati: il form vive in un dialog stretto (max-w-md) e
  // un'email a mezza larghezza si legge male
  const fields = (
    <div className="space-y-4">
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
                placeholder="nome@esempio.it"
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
                placeholder="+39 333 1234567"
                {...field}
                value={field.value ?? ""}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )

  if (!isOwnContact) {
    return (
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium transition-colors hover:text-foreground/80">
          {open ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          Contatti dell&apos;allieva (opzionali)
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-4">
          <p className="text-xs text-muted-foreground">
            Di norma non servono: le comunicazioni vanno ai genitori collegati.
          </p>
          {fields}
        </CollapsibleContent>
      </Collapsible>
    )
  }

  const missingEmail = !email || email.trim().length === 0

  return (
    <div className="space-y-3 rounded-md border border-amber-500/40 bg-amber-500/5 p-4">
      <div>
        <h4 className="text-sm font-medium">Contatti dell&apos;allieva</h4>
        <p className="text-xs text-muted-foreground">
          Maggiorenne e senza genitori collegati: questi sono gli unici
          recapiti che la scuola ha per lei.
        </p>
      </div>
      {fields}
      {missingEmail ? (
        <p className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Senza email non riceve ricevute, solleciti né inviti agli stage, e
            non puoi darle l&apos;accesso all&apos;area riservata.
          </span>
        </p>
      ) : (
        <FormDescription>
          Se l&apos;accesso all&apos;area riservata le è già stato mandato,
          cambiare qui l&apos;email non basta: va rimandato con
          &laquo;Reinvia accesso&raquo;, che allinea anche l&apos;account.
        </FormDescription>
      )}
    </div>
  )
}
