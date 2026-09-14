"use client"

import Link from "next/link"
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

type Props = {
  errorMessage?: string | null
}

export function LoginForm({ errorMessage }: Props) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
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

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Accesso IAD Portale</CardTitle>
        <CardDescription>
          Inserisci le tue credenziali per continuare
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {errorMessage ? (
          <div
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {errorMessage}
          </div>
        ) : null}

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
                      disabled={isSubmitting}
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
                      disabled={isSubmitting}
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
              disabled={isSubmitting}
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

        <Link
          href="/password-dimenticata"
          className="block min-h-11 py-3 text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Password dimenticata o primo accesso con link scaduto?
        </Link>
      </CardContent>
    </Card>
  )
}
