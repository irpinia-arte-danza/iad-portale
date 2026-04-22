"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import type { EmailLogRow } from "./queries"

const DATETIME_IT = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
})

interface Props {
  log: EmailLogRow | null
  open: boolean
  onOpenChange: (o: boolean) => void
}

function Row({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-3 gap-3 py-2 border-b last:border-b-0">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="col-span-2 text-sm break-all">{children}</dd>
    </div>
  )
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value)
        setCopied(true)
        toast.success("Copiato")
        setTimeout(() => setCopied(false), 1500)
      }}
      className="ml-2 inline-flex items-center rounded-md p-1 text-muted-foreground hover:bg-muted"
      aria-label="Copia"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
    </button>
  )
}

const TRIGGER_LABEL = {
  ADMIN_MANUAL: "Manuale",
  CRON: "Automatico (cron)",
} as const

const MILESTONE_LABEL: Record<string, string> = {
  PROMEMORIA_DUE: "Promemoria scadenza",
  SOLLECITO_FIRST: "1° sollecito",
  SOLLECITO_SECOND: "2° sollecito",
}

export function EmailLogTechnicalDialog({ log, open, onOpenChange }: Props) {
  if (!log) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent />
      </Dialog>
    )
  }

  const sentByName =
    [log.sentByUser.firstName, log.sentByUser.lastName]
      .filter(Boolean)
      .join(" ") || log.sentByUser.email

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Dettagli tecnici</DialogTitle>
          <DialogDescription>
            Informazioni di tracking per debugging e audit.
          </DialogDescription>
        </DialogHeader>

        <dl className="max-h-[60vh] overflow-y-auto">
          <Row label="Log ID">
            <span className="font-mono text-xs">{log.id}</span>
            <CopyButton value={log.id} />
          </Row>

          <Row label="Provider ID">
            {log.providerId ? (
              <>
                <span className="font-mono text-xs">{log.providerId}</span>
                <CopyButton value={log.providerId} />
              </>
            ) : (
              <span className="text-muted-foreground italic">—</span>
            )}
          </Row>

          <Row label="Inviato da">{sentByName}</Row>

          <Row label="Trigger">{TRIGGER_LABEL[log.triggeredBy]}</Row>

          {log.milestoneKey ? (
            <Row label="Milestone">
              {MILESTONE_LABEL[log.milestoneKey] ?? log.milestoneKey}
            </Row>
          ) : null}

          <Row label="Template">
            {log.template ? (
              <span className="font-mono text-xs">{log.template.slug}</span>
            ) : log.templateSlug ? (
              <span className="font-mono text-xs text-muted-foreground">
                {log.templateSlug} (template eliminato)
              </span>
            ) : (
              <span className="text-muted-foreground italic">—</span>
            )}
          </Row>

          <Row label="Destinatario">
            {log.recipientName
              ? `${log.recipientName} <${log.recipientEmail}>`
              : log.recipientEmail}
          </Row>

          <Row label="Status">{log.status}</Row>

          <Row label="Inviato il">{DATETIME_IT.format(log.sentAt)}</Row>

          {log.deliveredAt ? (
            <Row label="Consegnato">{DATETIME_IT.format(log.deliveredAt)}</Row>
          ) : null}

          {log.openedAt ? (
            <Row label="Aperto">{DATETIME_IT.format(log.openedAt)}</Row>
          ) : null}

          {log.bouncedAt ? (
            <Row label="Bounce">{DATETIME_IT.format(log.bouncedAt)}</Row>
          ) : null}

          {log.complainedAt ? (
            <Row label="Reclamo spam">
              {DATETIME_IT.format(log.complainedAt)}
            </Row>
          ) : null}

          {log.errorMessage ? (
            <Row label="Errore">
              <pre className="whitespace-pre-wrap rounded-md bg-destructive/10 p-2 text-xs text-destructive font-mono">
                {log.errorMessage}
              </pre>
            </Row>
          ) : null}
        </dl>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Chiudi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
