"use client"

import { unstable_rethrow, useRouter } from "next/navigation"
import { useState } from "react"
import { AlertTriangle, CheckCircle2, Loader2, Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { AccessInviteResult } from "@/lib/auth/access-status-types"

import { sendAccessInvite } from "../../parents/actions"

// Invio sequenziale con pausa minima tra un invito e l'altro: il servizio
// email (Resend) accetta poche richieste al secondo. Niente code né retry:
// chi non riceve l'invito resta nello stato di prima (lo stato è la coda),
// basta riselezionarlo e rilanciare.
const THROTTLE_MS = 1000

type Target = { id: string; name: string }
type Failure = { name: string; error: string }
type Phase = "confirm" | "running" | "done"

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  targets: Target[]
  onFinished: () => void
}

export function BulkAccessInviteDialog({
  open,
  onOpenChange,
  targets,
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

  async function run() {
    setPhase("running")
    let sent = 0
    const failed: Failure[] = []

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i]
      const startedAt = Date.now()

      let result: AccessInviteResult
      try {
        result = await sendAccessInvite(target.id, { skipRevalidate: true })
      } catch (error) {
        // Redirect di requireAdmin (sessione scaduta): interrompe il ciclo
        // e lascia navigare, non va contato come invio fallito.
        unstable_rethrow(error)
        result = {
          ok: false,
          code: "SEND_FAILED",
          error: "Errore di connessione durante l'invio",
        }
      }

      if (result.ok) sent += 1
      else failed.push({ name: target.name, error: result.error })

      setProcessed(i + 1)
      setSentCount(sent)
      setFailures([...failed])

      if (!result.ok && result.code === "RATE_LIMIT") {
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
                Invia accesso a {total} {total === 1 ? "genitore" : "genitori"}
              </DialogTitle>
              <DialogDescription>
                Ognuno riceverà un&apos;email con il link personale per
                scegliere la password. Chi era già stato invitato riceve un
                link nuovo e quello vecchio smette di funzionare.
              </DialogDescription>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Le email partono una alla volta (circa un secondo ciascuna):
              tieni aperta questa finestra finché non compare il riepilogo.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Annulla
              </Button>
              <Button onClick={run} disabled={total === 0}>
                <Send className="h-4 w-4" />
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
                {processed} di {total} completati
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
                {total === 1 ? "email inviata" : "email inviate"}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              {sentCount > 0 ? (
                <p className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                  {sentCount}{" "}
                  {sentCount === 1 ? "genitore ha" : "genitori hanno"} ricevuto
                  l&apos;email di accesso.
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
                        ? "genitore non è stato contattato"
                        : "genitori non sono stati contattati"}
                      .
                    </p>
                  ) : null}
                </div>
              ) : null}

              {failures.length > 0 ? (
                <div className="space-y-1">
                  <p className="flex items-center gap-2 font-medium">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    Non inviati ({failures.length})
                  </p>
                  <ul className="space-y-1">
                    {failures.map((failure, idx) => (
                      <li key={`${failure.name}-${idx}`} className="rounded-md border p-2">
                        <span className="font-medium">{failure.name}</span>
                        <br />
                        <span className="text-muted-foreground">{failure.error}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {failures.length > 0 || stopped ? (
                <p className="text-muted-foreground">
                  Chi non ha ricevuto l&apos;email resta nello stato di prima:
                  selezionalo di nuovo e rilancia l&apos;invio più tardi.
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
