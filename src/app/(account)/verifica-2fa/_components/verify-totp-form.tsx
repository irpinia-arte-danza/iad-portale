"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { logError } from "@/lib/logging/log-error"

import { logout } from "@/app/(public)/login/actions"

import { redeemRecoveryCode, verifySecondFactor, type SecondFactorResult } from "../actions"

type Mode = "totp" | "recovery"

// ─────────────────────────────────────────────────────────────────────────
// Sei numeri, o un codice di recupero. Dopo un codice di recupero l'azione
// rimanda a questa stessa pagina, che mostra quanti ne restano (page.tsx)
// prima di proseguire: è il momento in cui ci si accorge che stanno finendo.
// ─────────────────────────────────────────────────────────────────────────
export function VerifyTotpForm({ recoveryCodesLeft }: { recoveryCodesLeft: number }) {
  const [mode, setMode] = React.useState<Mode>("totp")
  const [code, setCode] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  function switchMode(next: Mode) {
    setMode(next)
    setCode("")
    setError(null)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const result: SecondFactorResult =
        mode === "totp" ? await verifySecondFactor({ code }) : await redeemRecoveryCode({ code })
      if (!result.ok || !result.data) {
        setError(result.ok ? "Riprova" : result.error)
        setCode("")
        return
      }
      window.location.assign(result.data.next)
    } catch (err) {
      logError("[2fa] verify", err)
      setError("Non è stato possibile controllare il codice, riprova")
    } finally {
      setBusy(false)
    }
  }

  const isTotp = mode === "totp"

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="second-factor">
          {isTotp ? "I sei numeri dell'app" : "Codice di recupero"}
        </Label>
        <Input
          id="second-factor"
          inputMode={isTotp ? "numeric" : "text"}
          autoComplete={isTotp ? "one-time-code" : "off"}
          autoCapitalize={isTotp ? "off" : "characters"}
          spellCheck={false}
          maxLength={isTotp ? 6 : 12}
          value={code}
          onChange={(e) =>
            setCode(
              isTotp
                ? e.target.value.replace(/\D/g, "").slice(0, 6)
                : e.target.value.toUpperCase().slice(0, 12),
            )
          }
          className="min-h-11 text-center font-mono text-lg tracking-[0.3em]"
          placeholder={isTotp ? "000000" : "XXXX-XXXX"}
          disabled={busy}
          autoFocus
          required
        />
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <Button
        type="submit"
        className="w-full min-h-11"
        disabled={busy || (isTotp ? code.length !== 6 : code.length < 8)}
      >
        {busy ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Controllo…
          </>
        ) : (
          "Entra"
        )}
      </Button>

      <div className="flex flex-col gap-1 text-center text-sm">
        {isTotp ? (
          <button
            type="button"
            className="min-h-11 text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => switchMode("recovery")}
          >
            Non hai l&apos;iPad? Usa un codice di recupero
            {recoveryCodesLeft > 0 ? ` (ne hai ${recoveryCodesLeft})` : ""}
          </button>
        ) : (
          <button
            type="button"
            className="min-h-11 text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => switchMode("totp")}
          >
            Torna ai sei numeri dell&apos;app
          </button>
        )}
        <button
          type="button"
          className="min-h-11 text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => logout()}
        >
          Esci
        </button>
      </div>
    </form>
  )
}
