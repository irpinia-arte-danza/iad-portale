"use client"

import { useCallback, useEffect, useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  BellRing,
  CalendarClock,
  Loader2,
  Mail,
  RefreshCw,
} from "lucide-react"
import { toast } from "sonner"

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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { useBeforeUnloadGuard } from "@/lib/hooks/use-dirty-form"
import {
  reminderConfigSchema,
  type ReminderConfigValues,
} from "@/lib/schemas/reminder-config"

import {
  previewCronReminders,
  updateReminderConfig,
  type CronPreview,
} from "../reminder-actions"

import { StickySaveBar } from "./sticky-save-bar"

interface ReminderTabProps {
  initial: ReminderConfigValues
  initialPreview: CronPreview
  onDirtyChange: (dirty: boolean) => void
}

export function ReminderTab({
  initial,
  initialPreview,
  onDirtyChange,
}: ReminderTabProps) {
  const [isPending, startTransition] = useTransition()
  const [preview, setPreview] = useState<CronPreview>(initialPreview)
  const [refreshing, startRefresh] = useTransition()

  const form = useForm<ReminderConfigValues>({
    resolver: zodResolver(reminderConfigSchema),
    defaultValues: initial,
    mode: "onBlur",
  })

  const isDirty = form.formState.isDirty
  useBeforeUnloadGuard(isDirty)
  useEffect(() => {
    onDirtyChange(isDirty)
  }, [isDirty, onDirtyChange])

  const enabled = form.watch("enabled")

  function onSubmit(values: ReminderConfigValues) {
    startTransition(async () => {
      const res = await updateReminderConfig(values)
      if (res.ok) {
        toast.success("Configurazione reminder aggiornata")
        form.reset(values)
        refresh()
      } else {
        toast.error(res.error)
      }
    })
  }

  function onDiscard() {
    form.reset(initial)
  }

  const refresh = useCallback(() => {
    startRefresh(async () => {
      try {
        const next = await previewCronReminders()
        setPreview(next)
      } catch (err) {
        console.error(err)
        toast.error("Impossibile aggiornare l'anteprima")
      }
    })
  }, [])

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BellRing className="h-4 w-4" />
              Reminder automatici
            </CardTitle>
            <CardDescription>
              Email inviate automaticamente alle 7:00 UTC (8:00 inverno / 9:00 estate a Roma)
              per quote in scadenza e solleciti su quote non pagate.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="enabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-md border p-3">
                  <div className="flex flex-col">
                    <FormLabel className="text-sm font-medium">
                      Invio automatico attivo
                    </FormLabel>
                    <FormDescription>
                      Se disattivato, il cron gira ma non invia email.
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

            <FormField
              control={form.control}
              name="excludeWeekends"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-md border p-3">
                  <div className="flex flex-col">
                    <FormLabel className="text-sm font-medium">
                      Salta sabato e domenica
                    </FormLabel>
                    <FormDescription>
                      Consigliato: le email transazionali hanno miglior tasso di apertura nei giorni feriali.
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Milestone</CardTitle>
            <CardDescription>
              Definisci quando inviare promemoria e solleciti rispetto alla data di scadenza della quota.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="daysBeforeDue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Promemoria (giorni prima)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={30}
                      step={1}
                      value={field.value}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === ""
                            ? 0
                            : Number.parseInt(e.target.value, 10),
                        )
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    Template: <span className="font-mono text-xs">promemoria-scadenza</span>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="firstReminderDaysAfter"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>1° sollecito (giorni dopo)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={30}
                      step={1}
                      value={field.value}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === ""
                            ? 0
                            : Number.parseInt(e.target.value, 10),
                        )
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    Template: <span className="font-mono text-xs">sollecito-scadenza</span>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="secondReminderDaysAfter"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>2° sollecito (giorni dopo)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={2}
                      max={60}
                      step={1}
                      value={field.value}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === ""
                            ? 0
                            : Number.parseInt(e.target.value, 10),
                        )
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    Deve essere maggiore del primo.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4" />
                  Anteprima invii di oggi
                </CardTitle>
                <CardDescription>
                  Calcolata in base alla config corrente ({preview.todayUTC} UTC).
                  Salva per ricalcolare.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={refresh}
                disabled={refreshing}
              >
                {refreshing ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1 h-4 w-4" />
                )}
                Aggiorna
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {!enabled ? (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
                Invio automatico disattivato — il cron non invia email finché non riattivi il toggle sopra.
              </div>
            ) : preview.isWeekendBlocked ? (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
                Oggi è weekend: nessun invio previsto (opzione &quot;Salta sabato e domenica&quot; attiva).
              </div>
            ) : preview.totalCount === 0 ? (
              <div className="rounded-md border p-3 text-sm text-muted-foreground">
                Nessun invio previsto oggi.
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>
                  <strong>{preview.totalCount}</strong> email totali in coda per oggi
                </span>
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-3">
              {preview.milestones.map((m) => (
                <div
                  key={m.key}
                  className="rounded-md border p-3 text-sm space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium">{m.label}</span>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {m.dueOffsetDays === 0
                        ? "oggi"
                        : m.dueOffsetDays > 0
                          ? `+${m.dueOffsetDays}g`
                          : `${m.dueOffsetDays}g`}
                    </Badge>
                  </div>
                  <div className="text-2xl font-semibold tabular-nums">
                    {m.count}
                  </div>
                  {m.topRecipients.length > 0 ? (
                    <ul className="space-y-0.5 text-xs text-muted-foreground">
                      {m.topRecipients.map((name, i) => (
                        <li key={`${m.key}-${i}`} className="truncate">
                          • {name}
                        </li>
                      ))}
                      {m.count > m.topRecipients.length ? (
                        <li className="text-[10px] italic">
                          + altri {m.count - m.topRecipients.length}
                        </li>
                      ) : null}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Nessun destinatario
                    </p>
                  )}
                  {m.missingEmailCount > 0 ? (
                    <p className="text-[11px] text-amber-700 dark:text-amber-400">
                      {m.missingEmailCount} senza email (saltate)
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
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
  )
}
