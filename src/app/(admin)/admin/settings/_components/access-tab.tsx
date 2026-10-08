"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2, Smartphone } from "lucide-react"
import { toast } from "sonner"

import { ResponsiveList, type ListColumn } from "@/components/lists/responsive-list"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { countryName, formatAccessMoment } from "@/lib/auth/access-format"
import type { AdminLoginRow, KnownDevice, PreviousLogin } from "@/lib/auth/admin-logins"
import { logError } from "@/lib/logging/log-error"
import { statusTone, TONE_BADGE } from "@/lib/status/tone"
import { cn } from "@/lib/utils"

import { forgetDevice } from "../actions"

// ─────────────────────────────────────────────────────────────────────────
// Impostazioni › Accessi: i propri accessi degli ultimi 90 giorni e i
// dispositivi che il portale riconosce. Serve ad accorgersi di un accesso
// che non si riconosce, non a fare statistiche.
// ─────────────────────────────────────────────────────────────────────────

const OUTCOME_LABEL: Record<AdminLoginRow["outcome"], string> = {
  OK: "Riuscito",
  WRONG_PASSWORD: "Password errata",
  WRONG_MFA: "Codice errato",
  BLOCKED: "Bloccato",
}

function OutcomeBadge({ outcome }: { outcome: AdminLoginRow["outcome"] }) {
  const tone = statusTone({ kind: "login", outcome })
  return (
    <Badge variant="outline" className={cn(TONE_BADGE[tone])}>
      {OUTCOME_LABEL[outcome]}
    </Badge>
  )
}

function NewDeviceBadge() {
  return <Badge variant="secondary">Dispositivo nuovo</Badge>
}

type Props = {
  logins: AdminLoginRow[]
  devices: KnownDevice[]
  currentDeviceId: string | null
  previousLogin: PreviousLogin | null
}

export function AccessTab({ logins, devices, currentDeviceId, previousLogin }: Props) {
  const columns: ListColumn<AdminLoginRow>[] = [
    {
      key: "data",
      header: "Data",
      width: "md:w-56",
      cell: (row) => <span className="text-sm">{formatAccessMoment(row.at)}</span>,
    },
    {
      key: "esito",
      header: "Esito",
      width: "md:w-36",
      cell: (row) => <OutcomeBadge outcome={row.outcome} />,
    },
    {
      key: "dispositivo",
      header: "Dispositivo",
      width: "md:flex-1",
      cell: (row) => (
        <span className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
          <span className="truncate">{row.device}</span>
          {row.newDevice ? <NewDeviceBadge /> : null}
        </span>
      ),
    },
    {
      key: "paese",
      header: "Paese",
      priority: "medium",
      width: "md:w-32",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">{countryName(row.country)}</span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Accessi degli ultimi 90 giorni</CardTitle>
          <CardDescription>
            {previousLogin ? (
              <>
                Ultimo accesso riuscito prima di questo:{" "}
                <strong className="text-foreground">{formatAccessMoment(previousLogin.at)}</strong>
                {" · "}
                {previousLogin.device} · {countryName(previousLogin.country)}.
              </>
            ) : (
              "Questo è il primo accesso da quando il portale tiene lo storico."
            )}{" "}
            Se vedi un orario o un dispositivo che non riconosci, cambia subito la password e avvisa
            l&apos;altro amministratore.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveList
            label="Accessi degli ultimi 90 giorni"
            items={logins}
            getId={(row) => row.id}
            columns={columns}
            cardLines={(row) => [
              <span key="esito" className="flex flex-wrap items-center gap-2">
                <OutcomeBadge outcome={row.outcome} />
                {row.newDevice ? <NewDeviceBadge /> : null}
              </span>,
              <span key="dove" className="text-sm text-muted-foreground">
                {row.device} · {countryName(row.country)}
              </span>,
            ]}
            empty={{
              title: "Nessun accesso registrato",
              hint: "Lo storico parte da oggi: il prossimo accesso comparirà qui.",
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dispositivi conosciuti</CardTitle>
          <CardDescription>
            I browser da cui sei già entrato. «Dimentica» fa tornare nuovo quel dispositivo: al
            prossimo accesso da lì arriverà di nuovo l&apos;email di avviso.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {devices.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessun dispositivo ancora registrato.</p>
          ) : (
            <ul className="divide-y">
              {devices.map((device) => (
                <DeviceRow
                  key={device.id}
                  device={device}
                  isCurrent={device.deviceId === currentDeviceId}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function DeviceRow({ device, isCurrent }: { device: KnownDevice; isCurrent: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = React.useState(false)

  async function onForget() {
    setBusy(true)
    try {
      const result = await forgetDevice(device.id)
      if (result.ok) {
        toast.success(`${device.label}: al prossimo accesso sarà un dispositivo nuovo`)
        router.refresh()
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      logError("[settings] forget device", error)
      toast.error("Non è stato possibile dimenticare il dispositivo, riprova")
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-2">
        <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="flex min-w-0 flex-col">
          <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
            {device.label}
            {isCurrent ? <Badge variant="outline">Questo dispositivo</Badge> : null}
          </span>
          <span className="text-xs text-muted-foreground">
            Dal {formatAccessMoment(device.firstSeenAt)} · ultimo accesso{" "}
            {formatAccessMoment(device.lastSeenAt)}
          </span>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="min-h-11 sm:min-h-9"
        onClick={onForget}
        disabled={busy}
      >
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Dimentica
      </Button>
    </li>
  )
}
