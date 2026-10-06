"use client"

import { AlertTriangle, Loader2, Mail, MessageCircle, Send } from "lucide-react"

import { EmailHtmlPreview } from "@/components/email-html-preview"
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
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { whatsappHref } from "@/lib/utils/whatsapp"
import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────
// Il dialog a due canali: WhatsApp o email, sempre con l'anteprima.
//
// Nato per i solleciti dei contributi (#38), serve uguale per chiedere il
// certificato: stesso gesto, stessa cautela. Qui c'è solo la forma — i due
// canali, l'anteprima, il testo modificabile per WhatsApp, i tasti. Da dove
// vengono il testo e i destinatari, e cosa succede all'invio, lo decide chi
// lo usa (Scadenze sceglie fra più modelli, Certificati ne ha uno per
// stato).
//
// WhatsApp si manda a una famiglia per volta: di gruppo c'è solo l'email.
// Il gestionale non manda niente su WhatsApp: apre la chat col messaggio già
// scritto, e registra che è uscito da qui.
// ─────────────────────────────────────────────────────────────────────────

export type ReminderChannel = "WHATSAPP" | "EMAIL"

export type TwoChannelPreview = {
  recipientName: string
  recipientEmail: string | null
  recipientPhone: string | null
  athleteName: string
  subject: string
  bodyHtml: string
  // Perché l'email non può partire, se non può
  warning?: string
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  // Più destinatari: solo email, niente scelta del canale
  isBulk: boolean
  channel: ReminderChannel
  onChannelChange: (channel: ReminderChannel) => void
  preview: TwoChannelPreview | null
  previewError: string | null
  isLoadingPreview: boolean
  // Il testo per WhatsApp, modificabile prima di aprire la chat
  whatsappText: string
  onWhatsappTextChange: (text: string) => void
  // Chiamata quando si apre WhatsApp: qui si registra la traccia
  onWhatsappOpened: () => void
  onSendEmail: () => void
  isSending: boolean
  canSendEmail: boolean
  sendLabel: string
  // Sopra l'anteprima: in Scadenze la scelta del modello, nel gruppo dei
  // certificati l'elenco di chi riceve e di chi no
  beforePreview?: React.ReactNode
  previewLabel?: string
}

export function TwoChannelReminderDialog({
  open,
  onOpenChange,
  title,
  description,
  isBulk,
  channel,
  onChannelChange,
  preview,
  previewError,
  isLoadingPreview,
  whatsappText,
  onWhatsappTextChange,
  onWhatsappOpened,
  onSendEmail,
  isSending,
  canSendEmail,
  sendLabel,
  beforePreview,
  previewLabel = "Anteprima (primo destinatario)",
}: Props) {
  const phone = preview?.recipientPhone ?? null
  const waHref = whatsappHref(phone, whatsappText)
  const activeChannel: ReminderChannel = isBulk ? "EMAIL" : channel

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {activeChannel === "WHATSAPP" ? (
              <MessageCircle className="h-5 w-5" />
            ) : (
              <Mail className="h-5 w-5" />
            )}
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!isBulk ? (
            <div
              role="group"
              aria-label="Come mandarlo"
              className="grid grid-cols-2 gap-2"
            >
              <Button
                type="button"
                variant={activeChannel === "WHATSAPP" ? "default" : "outline"}
                aria-pressed={activeChannel === "WHATSAPP"}
                className="h-11"
                disabled={!phone}
                title={phone ? undefined : "Nessun telefono in anagrafica"}
                onClick={() => onChannelChange("WHATSAPP")}
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </Button>
              <Button
                type="button"
                variant={activeChannel === "EMAIL" ? "default" : "outline"}
                aria-pressed={activeChannel === "EMAIL"}
                className="h-11"
                disabled={!preview?.recipientEmail}
                title={
                  preview?.recipientEmail
                    ? undefined
                    : "Nessuna email in anagrafica"
                }
                onClick={() => onChannelChange("EMAIL")}
              >
                <Mail className="h-4 w-4" />
                Email
              </Button>
            </div>
          ) : null}

          {beforePreview}

          <div
            className={cn("space-y-2", activeChannel !== "EMAIL" && "hidden")}
          >
            <Label>{previewLabel}</Label>
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
                <EmailHtmlPreview
                  title="Anteprima dell'email"
                  html={preview.bodyHtml}
                />
              </div>
            ) : (
              <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                Anteprima non ancora disponibile.
              </div>
            )}
          </div>

          {activeChannel === "WHATSAPP" ? (
            <div className="space-y-2">
              <Label htmlFor="whatsapp-text">
                Messaggio per {preview?.recipientName ?? "la famiglia"}
              </Label>
              <Textarea
                id="whatsapp-text"
                value={whatsappText}
                onChange={(e) => onWhatsappTextChange(e.target.value)}
                rows={8}
                className="font-sans text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Puoi modificarlo prima di aprire WhatsApp. Il gestionale non
                manda niente: registra solo che il messaggio è uscito da qui.
              </p>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
          >
            Annulla
          </Button>
          {activeChannel === "WHATSAPP" ? (
            <Button asChild disabled={!waHref}>
              <a
                href={waHref ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onWhatsappOpened}
              >
                <MessageCircle className="h-4 w-4" />
                Apri WhatsApp
              </a>
            </Button>
          ) : (
            <Button onClick={onSendEmail} disabled={isSending || !canSendEmail}>
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {sendLabel}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
