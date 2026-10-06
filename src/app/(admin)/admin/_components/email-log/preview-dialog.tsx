"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { EmailHtmlPreview } from "@/components/email-html-preview"

import type { EmailLogRow } from "./queries"

const DATETIME_IT = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

interface Props {
  log: EmailLogRow | null
  open: boolean
  onOpenChange: (o: boolean) => void
}

export function EmailLogPreviewDialog({ log, open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="truncate">{log?.subject ?? "—"}</DialogTitle>
          <DialogDescription>
            {log
              ? `A: ${log.recipientName ?? log.recipientEmail} <${log.recipientEmail}> · ${DATETIME_IT.format(log.sentAt)}`
              : ""}
          </DialogDescription>
        </DialogHeader>

        {log ? (
          // Il corpo è l'HTML spedito, con i valori già sostituiti: si legge
          // dentro un iframe isolato, non nella pagina del portale
          <EmailHtmlPreview
            title={`Email: ${log.subject}`}
            html={log.bodyHtml}
            className="block h-[60vh] w-full rounded-md border bg-white"
          />
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Chiudi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
