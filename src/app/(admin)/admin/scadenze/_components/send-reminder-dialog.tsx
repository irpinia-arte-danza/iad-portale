"use client"

import { useEffect, useState, useTransition } from "react"
import { AlertTriangle, Loader2, Mail, Send } from "lucide-react"
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
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

import {
  listReminderTemplates,
  previewReminder,
  sendReminderBatch,
  type ReminderPreview,
  type ReminderTemplateOption,
} from "../actions"

const CATEGORY_LABEL: Record<string, string> = {
  SOLLECITO: "Sollecito",
  PROMEMORIA: "Promemoria",
}

interface SendReminderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  scheduleIds: string[]
  defaultTemplateSlug?: string
  onSent?: () => void
}

export function SendReminderDialog({
  open,
  onOpenChange,
  scheduleIds,
  defaultTemplateSlug,
  onSent,
}: SendReminderDialogProps) {
  const [templates, setTemplates] = useState<ReminderTemplateOption[] | null>(
    null,
  )
  const [templateSlug, setTemplateSlug] = useState<string>("")
  const [preview, setPreview] = useState<ReminderPreview | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [isLoadingTemplates, startLoadingTemplates] = useTransition()
  const [isLoadingPreview, startLoadingPreview] = useTransition()
  const [isSending, startSending] = useTransition()

  useEffect(() => {
    if (!open) {
      setPreview(null)
      setPreviewError(null)
      return
    }

    startLoadingTemplates(async () => {
      try {
        const list = await listReminderTemplates()
        setTemplates(list)

        const initial =
          (defaultTemplateSlug &&
            list.find((t) => t.slug === defaultTemplateSlug)?.slug) ||
          list[0]?.slug ||
          ""
        setTemplateSlug(initial)
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Caricamento template fallito",
        )
      }
    })
  }, [open, defaultTemplateSlug])

  useEffect(() => {
    if (!open || !templateSlug || scheduleIds.length === 0) return

    const firstId = scheduleIds[0]
    setPreviewError(null)
    startLoadingPreview(async () => {
      try {
        const p = await previewReminder(firstId, templateSlug)
        setPreview(p)
      } catch (err) {
        setPreview(null)
        setPreviewError(
          err instanceof Error ? err.message : "Anteprima non disponibile",
        )
      }
    })
  }, [open, templateSlug, scheduleIds])

  async function handleSend() {
    if (!templateSlug || scheduleIds.length === 0) return

    startSending(async () => {
      try {
        const response = await sendReminderBatch(scheduleIds, templateSlug)
        const { sent, failed, skipped } = response.summary

        if (response.transportError && sent === 0) {
          toast.error(`Invio fallito: ${response.transportError}`)
          return
        }

        const parts: string[] = []
        if (sent > 0) parts.push(`${sent} inviate`)
        if (failed > 0) parts.push(`${failed} fallite`)
        if (skipped > 0) parts.push(`${skipped} saltate`)
        const summaryText = parts.join(" · ") || "Nessuna email inviata"

        if (sent > 0 && failed === 0 && skipped === 0) {
          toast.success(summaryText)
        } else if (sent > 0) {
          toast.warning(summaryText)
        } else {
          toast.error(summaryText)
        }

        onSent?.()
        onOpenChange(false)
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Errore durante l'invio",
        )
      }
    })
  }

  const templatesEmpty = templates !== null && templates.length === 0
  const count = scheduleIds.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Invia sollecito
          </DialogTitle>
          <DialogDescription>
            {count === 1
              ? "Verrà inviata 1 email al genitore collegato."
              : `Verranno inviate fino a ${count} email ai genitori collegati.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="template-select">Template</Label>
            {isLoadingTemplates && templates === null ? (
              <Skeleton className="h-10 w-full" />
            ) : templatesEmpty ? (
              <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                Nessun template attivo. Crea un template in Impostazioni.
              </div>
            ) : (
              <Select
                value={templateSlug}
                onValueChange={setTemplateSlug}
                disabled={isSending}
              >
                <SelectTrigger id="template-select">
                  <SelectValue placeholder="Seleziona template" />
                </SelectTrigger>
                <SelectContent>
                  {templates?.map((t) => (
                    <SelectItem key={t.slug} value={t.slug}>
                      <span className="flex items-center gap-2">
                        <span className="text-xs rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                          {CATEGORY_LABEL[t.category] ?? t.category}
                        </span>
                        {t.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label>Anteprima (primo destinatario)</Label>
            {isLoadingPreview ? (
              <div className="space-y-2 rounded-md border p-4">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : previewError ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                {previewError}
              </div>
            ) : preview ? (
              <div className="space-y-3 rounded-md border p-4">
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="text-muted-foreground">A:</span>{" "}
                    <span className="font-medium">{preview.recipientName}</span>{" "}
                    {preview.recipientEmail ? (
                      <span className="text-muted-foreground">
                        &lt;{preview.recipientEmail}&gt;
                      </span>
                    ) : null}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Allieva:</span>{" "}
                    {preview.athleteName}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Oggetto:</span>{" "}
                    <span className="font-medium">{preview.subject}</span>
                  </div>
                </div>
                {preview.warning ? (
                  <div className="flex items-start gap-2 rounded border border-amber-500/40 bg-amber-500/5 p-2 text-xs text-amber-700 dark:text-amber-500">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{preview.warning}</span>
                  </div>
                ) : null}
                <div
                  className="prose prose-sm dark:prose-invert max-h-64 max-w-none overflow-y-auto rounded border bg-muted/30 p-3"
                  dangerouslySetInnerHTML={{ __html: preview.bodyHtml }}
                />
              </div>
            ) : (
              <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                Seleziona un template per vedere l&apos;anteprima.
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
          >
            Annulla
          </Button>
          <Button
            onClick={handleSend}
            disabled={
              isSending ||
              !templateSlug ||
              templatesEmpty ||
              count === 0 ||
              !!previewError
            }
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {count === 1 ? "Invia email" : `Invia ${count} email`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
