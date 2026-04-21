"use client"

import { useEffect, useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useBeforeUnloadGuard } from "@/lib/hooks/use-dirty-form"
import {
  changePasswordSchema,
  profileSchema,
  type ChangePasswordValues,
  type ProfileValues,
} from "@/lib/schemas/admin-settings"

import { changePassword, updateProfile } from "../actions"
import { StickySaveBar } from "./sticky-save-bar"

interface AccountTabProps {
  initial: ProfileValues
  onDirtyChange: (dirty: boolean) => void
}

export function AccountTab({ initial, onDirtyChange }: AccountTabProps) {
  const [isPending, startTransition] = useTransition()
  const [pwPending, pwStartTransition] = useTransition()
  const [showPasswordCard, setShowPasswordCard] = useState(false)

  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: initial,
    mode: "onBlur",
  })

  const isDirty = form.formState.isDirty
  useBeforeUnloadGuard(isDirty)
  useEffect(() => {
    onDirtyChange(isDirty)
  }, [isDirty, onDirtyChange])

  const pwForm = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  })

  function onSubmit(values: ProfileValues) {
    startTransition(async () => {
      const res = await updateProfile(values)
      if (res.ok) {
        toast.success("Profilo aggiornato")
        form.reset(values)
      } else {
        toast.error(res.error)
      }
    })
  }

  function onDiscard() {
    form.reset(initial)
  }

  function onSubmitPassword(values: ChangePasswordValues) {
    pwStartTransition(async () => {
      const res = await changePassword(values)
      if (res.ok) {
        toast.success("Password aggiornata")
        pwForm.reset({ newPassword: "", confirmPassword: "" })
        setShowPasswordCard(false)
      } else {
        toast.error(res.error)
      }
    })
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dati personali</CardTitle>
              <CardDescription>
                Nome, email e contatti personali. L&apos;email è usata anche per il
                login.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
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
                    <FormLabel>Telefono (opzionale)</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        inputMode="tel"
                        {...field}
                        value={field.value ?? ""}
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
              <CardTitle>Preferenze</CardTitle>
              <CardDescription>
                Tema e lingua dell&apos;interfaccia. Si applicano solo al tuo
                account.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="themePreference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tema</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="system">Automatico</SelectItem>
                        <SelectItem value="light">Chiaro</SelectItem>
                        <SelectItem value="dark">Scuro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="localePreference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lingua</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="it">Italiano</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <StickySaveBar
            visible={isDirty}
            submitting={isPending}
            onSave={form.handleSubmit(onSubmit)}
            onDiscard={onDiscard}
          />
        </form>
      </Form>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>
            Aggiorna la password usata per accedere al pannello.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showPasswordCard ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPasswordCard(true)}
            >
              Cambia password
            </Button>
          ) : (
            <Form {...pwForm}>
              <form
                onSubmit={pwForm.handleSubmit(onSubmitPassword)}
                className="space-y-4"
              >
                <FormField
                  control={pwForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nuova password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          autoComplete="new-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={pwForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Conferma password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          autoComplete="new-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex items-center gap-2">
                  <Button type="submit" disabled={pwPending}>
                    {pwPending ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : null}
                    Aggiorna password
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      pwForm.reset({ newPassword: "", confirmPassword: "" })
                      setShowPasswordCard(false)
                    }}
                    disabled={pwPending}
                  >
                    Annulla
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
