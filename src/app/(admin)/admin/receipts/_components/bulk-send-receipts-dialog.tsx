"use client"

import { unstable_rethrow, useRouter } from "next/navigation"
import { useState } from "react"
import { AlertTriangle, CheckCircle2, Loader2, Mail } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { SendReceiptEmailResult } from "@/lib/receipts/send-receipt-email"

import { sendReceiptByEmail } from "../actions"

// Invio sequenziale con pausa, come per gli inviti di accesso: il servizio
// email accetta poche richieste al secondo, e l'API batch di Resend non
// supporta gli allegati, quindi le ricevute partono una alla volta.
const THROTTLE_MS = 1000

type Target = { id: string; label: string }
type Failure = { label: string; error: string }
type Phase = "confirm" | "running" | "done"

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  targets: Target[]
  // Quante email sono già partite oggi e quante restano sulle 100 del piano
  quota: { sentToday: number; remaining: number; limit: number }
  onFinished: () => void
}

export function BulkSendReceiptsDialog({
  open,
  onOpenChange,
  targets,
  quota,
  onFinished,
}: Props) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>("confirm")
  const [processed, setProcessed] = useState(0)
  const [sentCount, setSentCount] = useState(0)
  const [failures, setFailures] = useState<Failure[]>([])
  const [stopped, setStopped] = useState<{
    message: string
    notAttempted: number
  } | null>(null)

  const total = targets.length
  const percent = total === 0 ? 0 : Math.round((processed / total) * 100)
  const overQuota = total > quota.remaining

  async function run() {
    setPhase("running")
    let sent = 0
    const failed: Failure[] = []

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i]
      const startedAt = Date.now()

      let result: SendReceiptEmailResult
      try {
        result = await sendReceiptByEmail(target.id, { skipRevalidate: true })
      } catch (error) {
        // Redirect di requireAdmin (sessione scaduta): lascia navigare
        unstable_rethrow(error)
        result = {
          ok: false,
          code: "SEND_FAILED",
          error: "Errore di connessione durante l'invio",
        }
      }

      if (result.ok) sent += 1
      else failed.push({ label: target.label, error: result.error })

      setProcessed(i + 1)
      setSentCount(sent)
      setFailures([...failed])

      // Quota finita o troppe richieste: non ha senso insistere sulle altre
      if (!result.ok && (result.code === "QUOTA" || result.code === "RATE_LIMIT")) {
        setStopped({ message: result.error, notAttempted: targets.length - i - 1 })
        break
      }

      const wait = THROTTLE_MS - (Date.now() - startedAt)
      if (i < targets.length - 1 && wait > 0) await sleep(wait)
    }

    setPhase("done")
    router.refresh()
  }

  function handleOpenChange(next: boolean) {
    if (phase === "running") return
    onOpenChange(next)
    if (!next && phase === "done") onFinished()
  }

  function blockWhileRunning(event: Event) {
    if (phase === "running") event.preventDefault()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-h-[85dvh] overflow-y-auto sm:max-w-md"
        onEscapeKeyDown={blockWhileRunning}
        onPointerDownOutside={blockWhileRunning}
        onInteractOutside={blockWhileRunning}
      >
        {phase === "confirm" ? (
          <>
            <DialogHeader>
              <DialogTitle>
                Invia {total} {total === 1 ? "ricevuta" : "ricevute"}
              </DialogTitle>
              <DialogDescription>
                Ognuna parte come allegato PDF all&apos;indirizzo del pagante
                intestatario, quello stampato sulla ricevuta.
              </DialogDescription>
            </DialogHeader>

            {overQuota ? (
              <p className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Oggi sono già partite {quota.sentToday} email delle{" "}
                  {quota.limit} giornaliere: ne restano{" "}
                  <strong>{quota.remaining}</strong>, meno delle {total}{" "}
                  selezionate. Le ultime verranno rifiutate: puoi partire lo
                  stesso e riprendere domani, oppure ridurre la selezione.
                </span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Oggi sono partite {quota.sentToday} email delle {quota.limit}{" "}
                giornaliere: ne restano {quota.remaining}.
              </p>
            )}

            <p className="text-sm text-muted-foreground">
              Partono una alla volta (circa un secondo ciascuna): tieni aperta
              questa finestra finché non compare il riepilogo.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Annulla
              </Button>
              <Button onClick={run} disabled={total === 0}>
                <Mail className="h-4 w-4" />
                Invia
              </Button>
            </DialogFooter>
          </>
        ) : null}

        {phase === "running" ? (
          <>
            <DialogHeader>
              <DialogTitle>Invio in corso…</DialogTitle>
              <DialogDescription>Non chiudere questa finestra.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <div
                className="h-2 w-full overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={total}
                aria-valuenow={processed}
              >
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {processed} di {total} completate
              </p>
            </div>
          </>
        ) : null}

        {phase === "done" ? (
          <>
            <DialogHeader>
              <DialogTitle>Riepilogo invio</DialogTitle>
              <DialogDescription>
                {sentCount} di {total}{" "}
                {total === 1 ? "ricevuta inviata" : "ricevute inviate"}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              {sentCount > 0 ? (
                <p className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                  {sentCount}{" "}
                  {sentCount === 1
                    ? "famiglia ha ricevuto la ricevuta"
                    : "famiglie hanno ricevuto la ricevuta"}
                  .
                </p>
              ) : null}

              {stopped ? (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
                  <p className="font-medium">Invio interrotto</p>
                  <p>{stopped.message}</p>
                  {stopped.notAttempted > 0 ? (
                    <p className="mt-1">
                      {stopped.notAttempted}{" "}
                      {stopped.notAttempted === 1
                        ? "ricevuta non è stata tentata"
                        : "ricevute non sono state tentate"}
                      .
                    </p>
                  ) : null}
                </div>
              ) : null}

              {failures.length > 0 ? (
                <div className="space-y-1">
                  <p className="flex items-center gap-2 font-medium">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    Non inviate ({failures.length})
                  </p>
                  <ul className="space-y-1">
                    {failures.map((failure, idx) => (
                      <li
                        key={`${failure.label}-${idx}`}
                        className="rounded-md border p-2"
                      >
                        <span className="font-mono text-xs font-medium">
                          {failure.label}
                        </span>
                        <br />
                        <span className="text-muted-foreground">
                          {failure.error}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {failures.length > 0 || stopped ? (
                <p className="text-muted-foreground">
                  Le ricevute non inviate restano nello stato di prima:
                  selezionale di nuovo e rilancia l&apos;invio più tardi.
                </p>
              ) : null}
            </div>
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Chiudi</Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
