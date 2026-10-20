"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { IdCard, Loader2, RefreshCw, Send, UserX } from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
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
import type { CardManagerRow } from "@/lib/cards/card-managers"
import { logError } from "@/lib/logging/log-error"
import {
  cardManagerInviteSchema,
  type CardManagerInviteValues,
} from "@/lib/schemas/admin-settings"
import { formatDateShort } from "@/lib/utils/format"

import { inviteCardManager, resendCardManagerInvite, revokeCardManager } from "../actions"

// ─────────────────────────────────────────────────────────────────────────
// Il referente tessere: chi riceve da Giuseppina l'elenco da tesserare e le
// rimanda i PDF. Con un accesso suo vede la coda e carica le tessere da sé,
// in /tessere, senza vedere altro (niente contatti, pagamenti, certificati).
// ─────────────────────────────────────────────────────────────────────────

function fullName(r: CardManagerRow): string {
  return [r.firstName, r.lastName].filter(Boolean).join(" ") || r.email
}

export function CardManagerSection({ managers }: { managers: CardManagerRow[] }) {
  const [busyId, setBusyId] = React.useState<string | null>(null)
  const [revokeTarget, setRevokeTarget] = React.useState<CardManagerRow | null>(null)
  const [isPending, startTransition] = React.useTransition()

  const form = useForm<CardManagerInviteValues>({
    resolver: zodResolver(cardManagerInviteSchema),
    defaultValues: { email: "", firstName: "", lastName: "" },
  })

  function onSubmit(values: CardManagerInviteValues) {
    startTransition(async () => {
      const res = await inviteCardManager(values)
      if (res.ok) {
        toast.success(`Accesso inviato a ${res.data?.email}`)
        form.reset({ email: "", firstName: "", lastName: "" })
      } else {
        toast.error(res.error)
      }
    })
  }

  async function resend(r: CardManagerRow) {
    setBusyId(r.id)
    try {
      const res = await resendCardManagerInvite(r.id)
      if (res.ok) toast.success(`Accesso reinviato a ${r.email}`)
      else toast.error(res.error)
    } catch (error) {
      logError("[settings] resend card manager", error)
      toast.error("Non è stato possibile reinviare l'accesso, riprova")
    } finally {
      setBusyId(null)
    }
  }

  async function revoke() {
    if (!revokeTarget) return
    setBusyId(revokeTarget.id)
    try {
      const res = await revokeCardManager(revokeTarget.id)
      if (res.ok) {
        toast.success(`Accesso di ${fullName(revokeTarget)} revocato`)
        setRevokeTarget(null)
      } else {
        toast.error(res.error)
      }
    } catch (error) {
      logError("[settings] revoke card manager", error)
      toast.error("Non è stato possibile revocare l'accesso, riprova")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Referente tessere</CardTitle>
        <CardDescription>
          Il referente ENDAS a cui oggi mandi l&apos;elenco da tesserare. Con un accesso suo vede
          chi è da tesserare (solo i dati anagrafici che chiede l&apos;ente), scarica l&apos;elenco e
          carica da sé le tessere. Non vede contatti, pagamenti, certificati né altro.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {managers.length > 0 ? (
          <ul className="divide-y rounded-md border">
            {managers.map((r) => (
              <li
                key={r.id}
                className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-2">
                  <IdCard className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{fullName(r)}</p>
                    <p className="truncate text-xs text-muted-foreground">{r.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.access === "ACTIVE"
                        ? r.lastSignInAt
                          ? `Attivo · ultimo accesso il ${formatDateShort(r.lastSignInAt)}`
                          : "Attivo"
                        : `Invitato il ${formatDateShort(r.invitedAt)} · non ancora entrato`}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {r.access === "INVITED" ? (
                    <Badge variant="secondary" className="self-center">
                      In attesa
                    </Badge>
                  ) : null}
                  {r.access === "INVITED" ? (
                    <Button
                      variant="outline"
                      className="h-11 sm:h-9"
                      onClick={() => resend(r)}
                      disabled={busyId === r.id}
                    >
                      {busyId === r.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      Reinvia accesso
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    className="h-11 sm:h-9"
                    onClick={() => setRevokeTarget(r)}
                    disabled={busyId === r.id}
                  >
                    <UserX className="h-4 w-4" />
                    Revoca
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <p className="text-sm font-medium">
              {managers.length > 0 ? "Invita un altro referente" : "Invita il referente"}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input {...field} autoComplete="off" />
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
                      <Input {...field} autoComplete="off" />
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
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" inputMode="email" autoComplete="off" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="h-11 w-full sm:w-auto" disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Invia accesso
            </Button>
          </form>
        </Form>
      </CardContent>

      <AlertDialog open={revokeTarget !== null} onOpenChange={(o) => !o && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Revocare l&apos;accesso di {revokeTarget ? fullName(revokeTarget) : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Dalla prossima pagina che apre non entra più. Le tessere che ha caricato restano. Per
              ridargli l&apos;accesso basta invitarlo di nuovo con la stessa email.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busyId !== null}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void revoke()
              }}
              disabled={busyId !== null}
            >
              Revoca
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
