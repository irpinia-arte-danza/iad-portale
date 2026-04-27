"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"
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
import { createClient } from "@/lib/supabase/client"

import { login } from "./actions"

const loginSchema = z.object({
  email: z
    .string()
    .min(1, { message: "Email obbligatoria" })
    .email({ message: "Email non valida" }),
  password: z
    .string()
    .min(8, { message: "Password minimo 8 caratteri" }),
})

type LoginFormValues = z.infer<typeof loginSchema>

const resetSchema = z.object({
  email: z
    .string()
    .min(1, { message: "Email obbligatoria" })
    .email({ message: "Email non valida" }),
})

type ResetFormValues = z.infer<typeof resetSchema>

function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.05-3.72 1.05-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.43.34-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.93l3.66-2.83z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.07.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  )
}

export function LoginForm() {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isOauth, setIsOauth] = React.useState(false)
  const [resetOpen, setResetOpen] = React.useState(false)
  const [resetSending, setResetSending] = React.useState(false)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const resetForm = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: "" },
  })

  async function onSubmit(values: LoginFormValues) {
    setIsSubmitting(true)
    const result = await login(values)
    if (result?.error) {
      toast.error(result.error)
      setIsSubmitting(false)
    }
    // on success: server action redirects, component unmounts
  }

  async function onGoogle() {
    setIsOauth(true)
    try {
      const supabase = createClient()
      const origin = window.location.origin
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback`,
        },
      })
      if (error) {
        toast.error(error.message)
        setIsOauth(false)
      }
      // on success: browser redirects to Google, component unmounts
    } catch (error) {
      console.error("[login] google oauth error", error)
      toast.error("Errore avvio accesso Google")
      setIsOauth(false)
    }
  }

  async function onReset(values: ResetFormValues) {
    setResetSending(true)
    try {
      const supabase = createClient()
      const origin = window.location.origin
      const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: `${origin}/auth/callback?next=/reset-password`,
      })
      if (error) {
        toast.error(error.message)
      } else {
        toast.success("Email di reset inviata, controlla la tua casella")
        setResetOpen(false)
        resetForm.reset()
      }
    } catch (error) {
      console.error("[login] reset password error", error)
      toast.error("Errore invio email di reset")
    } finally {
      setResetSending(false)
    }
  }

  const anyBusy = isSubmitting || isOauth

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Accesso IAD Portale</CardTitle>
        <CardDescription>
          Inserisci le tue credenziali per continuare
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
                      placeholder="es. nome@esempio.it"
                      disabled={anyBusy}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="current-password"
                      disabled={anyBusy}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full min-h-11"
              disabled={anyBusy}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Accesso in corso...
                </>
              ) : (
                "Accedi"
              )}
            </Button>
          </form>
        </Form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">oppure</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full min-h-11"
          onClick={onGoogle}
          disabled={anyBusy}
        >
          {isOauth ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Apertura Google...
            </>
          ) : (
            <>
              <GoogleIcon />
              <span className="ml-2">Continua con Google</span>
            </>
          )}
        </Button>

        {resetOpen ? (
          <Form {...resetForm}>
            <form
              onSubmit={resetForm.handleSubmit(onReset)}
              className="space-y-3 rounded-md border p-3"
              noValidate
            >
              <p className="text-sm font-medium">Recupera password</p>
              <FormField
                control={resetForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="sr-only">Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        placeholder="es. nome@esempio.it"
                        disabled={resetSending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2">
                <Button
                  type="submit"
                  size="sm"
                  className="min-h-11 flex-1"
                  disabled={resetSending}
                >
                  {resetSending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Invio...
                    </>
                  ) : (
                    "Invia email di reset"
                  )}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="min-h-11"
                  onClick={() => setResetOpen(false)}
                  disabled={resetSending}
                >
                  Annulla
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <button
            type="button"
            onClick={() => setResetOpen(true)}
            className="w-full text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Password dimenticata?
          </button>
        )}
      </CardContent>
    </Card>
  )
}
