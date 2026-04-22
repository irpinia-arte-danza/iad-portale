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
          <div
            className="prose prose-sm dark:prose-invert max-w-none rounded-md border bg-background p-4 max-h-[60vh] overflow-y-auto"
            // Body HTML is the snapshot of what was sent — already rendered with
            // variables replaced. Safe to render inline.
            dangerouslySetInnerHTML={{ __html: log.bodyHtml }}
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
