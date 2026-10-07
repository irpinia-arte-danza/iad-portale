"use client"

import * as React from "react"
import Link from "next/link"
import { Check, Copy, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { logError } from "@/lib/logging/log-error"

import {
  completeSecondFactorEnrollment,
  startSecondFactorEnrollment,
} from "../actions"

type Step =
  | { kind: "loading" }
  | { kind: "failed"; message: string }
  | { kind: "scan"; factorId: string; qrCode: string; secret: string }
  | { kind: "codes"; recoveryCodes: string[] }

// ─────────────────────────────────────────────────────────────────────────
// Tre passi, uno alla volta: inquadra il QR, scrivi i sei numeri, salva i
// codici di recupero. Testi per chi non ha mai sentito parlare di «TOTP».
// ─────────────────────────────────────────────────────────────────────────
export function EnrollTotp() {
  const [step, setStep] = React.useState<Step>({ kind: "loading" })
  const [code, setCode] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [saved, setSaved] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    startSecondFactorEnrollment()
      .then((result) => {
        if (cancelled) return
        if (result.ok && result.data) setStep({ kind: "scan", ...result.data })
        else setStep({ kind: "failed", message: result.ok ? "Riprova" : result.error })
      })
      .catch((error) => {
        logError("[2fa] start enrollment", error)
        if (!cancelled) setStep({ kind: "failed", message: "Non è stato possibile iniziare, riprova" })
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function onVerify(e: React.FormEvent) {
    e.preventDefault()
    if (step.kind !== "scan") return
    setBusy(true)
    try {
      const result = await completeSecondFactorEnrollment({ factorId: step.factorId, code })
      if (result.ok && result.data) {
        setStep({ kind: "codes", recoveryCodes: result.data.recoveryCodes })
      } else {
        toast.error(result.ok ? "Riprova" : result.error)
        setCode("")
      }
    } finally {
      setBusy(false)
    }
  }

  async function copyCodes(codes: string[]) {
    try {
      await navigator.clipboard.writeText(codes.join("\n"))
      setCopied(true)
      toast.success("Codici copiati")
    } catch {
      toast.error("Copia non riuscita: scrivili a mano")
    }
  }

  if (step.kind === "loading") {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Preparo il codice da inquadrare…
      </p>
    )
  }

  if (step.kind === "failed") {
    return (
      <div className="space-y-3 text-sm">
        <p className="text-destructive">{step.message}</p>
        <Button asChild variant="outline" className="min-h-11">
          <Link href="/verifica-2fa">Torna indietro</Link>
        </Button>
      </div>
    )
  }

  if (step.kind === "scan") {
    return (
      <form onSubmit={onVerify} className="space-y-5" noValidate>
        <ol className="list-decimal space-y-2 pl-5 text-sm">
          <li>
            Apri l&apos;app <strong>Password</strong> sull&apos;iPad, scegli l&apos;account del
            portale (o creane uno nuovo) e tocca <strong>Imposta codice di verifica</strong>.
          </li>
          <li>Inquadra questo codice con la fotocamera.</li>
          <li>Scrivi qui sotto i <strong>sei numeri</strong> che compaiono.</li>
        </ol>

        <div className="flex justify-center rounded-md border bg-white p-3">
          {/* Il QR arriva da Supabase come immagine SVG: nessun dato esce da qui */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={step.qrCode} alt="Codice da inquadrare con l'app Password" className="h-48 w-48" />
        </div>

        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">La fotocamera non legge il codice?</summary>
          <p className="mt-2">
            Nell&apos;app scegli «Inserisci codice manualmente» e scrivi questa chiave:
          </p>
          <code className="mt-1 block break-all rounded bg-muted px-2 py-1 font-mono text-sm text-foreground">
            {step.secret}
          </code>
        </details>

        <div className="space-y-2">
          <Label htmlFor="totp">I sei numeri dell&apos;app</Label>
          <Input
            id="totp"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="min-h-11 text-center font-mono text-lg tracking-[0.4em]"
            placeholder="000000"
            disabled={busy}
            required
          />
        </div>

        <Button type="submit" className="w-full min-h-11" disabled={busy || code.length !== 6}>
          {busy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Controllo…
            </>
          ) : (
            "Collega l'app"
          )}
        </Button>
      </form>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-status-ok">
        <Check className="h-4 w-4" /> App collegata. Ultima cosa: i codici di recupero.
      </div>
      <p className="text-sm text-muted-foreground">
        Se un giorno l&apos;iPad non c&apos;è, uno di questi codici ti fa entrare al posto dei sei
        numeri. <strong>Ogni codice vale una volta sola.</strong> Salvali nell&apos;app Password
        (nelle note dell&apos;account) o scrivili su un foglio che tieni in un posto sicuro: qui
        non compariranno più.
      </p>
      <ul className="grid grid-cols-2 gap-2 rounded-md border bg-muted/30 p-3 font-mono text-sm">
        {step.recoveryCodes.map((c) => (
          <li key={c} className="text-center tracking-wider">
            {c}
          </li>
        ))}
      </ul>
      <Button
        type="button"
        variant="outline"
        className="w-full min-h-11"
        onClick={() => copyCodes(step.recoveryCodes)}
      >
        {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
        Copia i codici
      </Button>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
        <input
          type="checkbox"
          className="h-5 w-5"
          checked={saved}
          onChange={(e) => setSaved(e.target.checked)}
        />
        Ho salvato gli otto codici
      </label>
      {saved ? (
        <Button asChild className="w-full min-h-11">
          <Link href="/admin/dashboard">Vai alla dashboard</Link>
        </Button>
      ) : (
        <Button type="button" className="w-full min-h-11" disabled>
          Vai alla dashboard
        </Button>
      )}
    </div>
  )
}
