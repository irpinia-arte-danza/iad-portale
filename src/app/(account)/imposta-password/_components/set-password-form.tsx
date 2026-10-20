"use client"

import * as React from "react"
import { unstable_rethrow } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { passwordPolicyHint } from "@/lib/auth/password-policy"
import {
  setOwnPasswordSchema,
  type SetOwnPasswordValues,
} from "@/lib/schemas/admin-settings"

import { setOwnPassword } from "../actions"

type Props = {
  // La sessione non viene da un link personale appena aperto: serve anche
  // la password attuale (il server lo riverifica)
  requireCurrentPassword: boolean
}

export function SetPasswordForm({ requireCurrentPassword }: Props) {
  const [busy, setBusy] = React.useState(false)
  // Il ref blocca subito il secondo tap: lo stato busy arriva al tasto solo
  // al render successivo, e fra la validazione e quel render un secondo
  // invio passava
  const sending = React.useRef(false)

  const form = useForm<SetOwnPasswordValues>({
    resolver: zodResolver(setOwnPasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  })

  async function onSubmit(values: SetOwnPasswordValues) {
    setBusy(true)
    try {
      const result = await setOwnPassword(values)
      if (result && !result.ok) {
        toast.error(result.error)
        sending.current = false
        setBusy(false)
      }
      // on success: server action redirects, component unmounts
    } catch (error) {
      // Dopo il salvataggio la action fa redirect(): lato client la chiamata
      // viene rifiutata con l'errore NEXT_REDIRECT mentre Next naviga. Va
      // rilanciato, altrimenti compare un falso "salvataggio non riuscito".
      unstable_rethrow(error)
      toast.error("Salvataggio non riuscito: controlla la connessione e riprova")
      sending.current = false
      setBusy(false)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={(event) => {
          if (sending.current) {
            event.preventDefault()
            return
          }
          sending.current = true
          void form.handleSubmit(onSubmit, () => {
            // Validazione non passata: il modulo si può rimandare
            sending.current = false
          })(event)
        }}
        className="space-y-4"
        noValidate
      >
        {requireCurrentPassword ? (
          <FormField
            control={form.control}
            name="currentPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password attuale</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="current-password"
                    disabled={busy}
                    className="min-h-11"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}
        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nuova password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="new-password"
                  disabled={busy}
                  className="min-h-11"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ripeti la password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="new-password"
                  disabled={busy}
                  className="min-h-11"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <p className="text-xs text-muted-foreground">
          {passwordPolicyHint()} Scegli una password che non usi su altri siti.
          {requireCurrentPassword
            ? " Dopo il salvataggio le altre sessioni aperte verranno chiuse e riceverai un'email di avviso."
            : " Riceverai un'email di avviso."}
        </p>
        <Button
          type="submit"
          className="w-full min-h-11"
          disabled={busy || form.formState.isSubmitting}
        >
          {busy || form.formState.isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvataggio...
            </>
          ) : (
            "Salva e continua"
          )}
        </Button>
      </form>
    </Form>
  )
}
