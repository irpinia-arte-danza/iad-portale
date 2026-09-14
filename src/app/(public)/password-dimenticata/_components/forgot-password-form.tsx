"use client"

import Link from "next/link"
import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, MailCheck } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

import { requestPasswordReset } from "../actions"

const formSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { message: "Inserisci la tua email" })
    .email({ message: "Email non valida" }),
})

type FormValues = z.infer<typeof formSchema>

type Props = {
  linkInvalid: boolean
}

export function ForgotPasswordForm({ linkInvalid }: Props) {
  const [busy, setBusy] = React.useState(false)
  const [sent, setSent] = React.useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "" },
  })

  async function onSubmit(values: FormValues) {
    setBusy(true)
    try {
      const result = await requestPasswordReset(values)
      if (result.ok) {
        setSent(true)
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error("Richiesta non inviata: controlla la connessione e riprova")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">
          {linkInvalid ? "Link non più valido" : "Password dimenticata"}
        </CardTitle>
        <CardDescription>
          {linkInvalid
            ? "Richiedi un nuovo link per entrare nell'area riservata."
            : "Inserisci l'email con cui accedi: ti mandiamo un link per scegliere una nuova password."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {linkInvalid && !sent ? (
          <div
            role="status"
            className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100"
          >
            Il link che hai aperto è scaduto oppure è già stato usato. Inserisci
            la tua email qui sotto: ti mandiamo un link nuovo.
          </div>
        ) : null}

        {sent ? (
          <div
            role="status"
            className="space-y-2 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100"
          >
            <p className="flex items-center gap-2 font-medium">
              <MailCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
              Controlla la tua casella email
            </p>
            <p>
              Se l&apos;indirizzo è collegato a un accesso all&apos;area
              riservata, riceverai a breve un&apos;email con il link per
              scegliere la password. Guarda anche nella cartella spam.
            </p>
            <p>Non arriva entro qualche minuto? Contatta la segreteria.</p>
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
              noValidate
            >
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
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        placeholder="es. nome@esempio.it"
                        disabled={busy}
                        className="min-h-11"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full min-h-11" disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Invio in corso...
                  </>
                ) : (
                  "Inviami il link"
                )}
              </Button>
            </form>
          </Form>
        )}

        <Link
          href="/login"
          className="block min-h-11 py-3 text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Torna alla pagina di accesso
        </Link>
      </CardContent>
    </Card>
  )
}
