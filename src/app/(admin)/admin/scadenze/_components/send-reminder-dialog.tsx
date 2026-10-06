"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"

import { TwoChannelReminderDialog } from "@/components/reminders/two-channel-dialog"
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
  recordWhatsappReminder,
  sendReminderBatch,
  type ReminderPreview,
  type ReminderTemplateOption,
} from "../actions"

type Channel = "WHATSAPP" | "EMAIL"

const CATEGORY_LABEL: Record<string, string> = {
  SOLLECITO: "Sollecito",
  PROMEMORIA: "Promemoria",
}

interface SendReminderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  scheduleIds: string[]
  // Quante famiglie riceveranno il messaggio: con il raggruppamento per
  // pagante le email sono una per famiglia, non una per rata
  payerCount?: number
  defaultTemplateSlug?: string
  onSent?: () => void
}

export function SendReminderDialog({
  open,
  onOpenChange,
  scheduleIds,
  payerCount,
  defaultTemplateSlug,
  onSent,
}: SendReminderDialogProps) {
  const router = useRouter()
  const [templates, setTemplates] = useState<ReminderTemplateOption[] | null>(
    null,
  )
  const [templateSlug, setTemplateSlug] = useState<string>("")
  const [preview, setPreview] = useState<ReminderPreview | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [isLoadingTemplates, startLoadingTemplates] = useTransition()
  const [isLoadingPreview, startLoadingPreview] = useTransition()
  const [isSending, startSending] = useTransition()
  const [channel, setChannel] = useState<Channel>("WHATSAPP")
  // Il testo per WhatsApp è modificabile: il modello è un punto di partenza,
  // non una gabbia
  const [whatsappText, setWhatsappText] = useState("")

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
        setWhatsappText(p.whatsappText)
        // Canale predefinito: WhatsApp se c'è il numero. È il canale che
        // Giuseppina usa già con le famiglie.
        setChannel(p.recipientPhone ? "WHATSAPP" : "EMAIL")
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
  const families = payerCount ?? count
  // WhatsApp si manda a una famiglia per volta: il gruppo è solo per email
  const isBulk = count > 1
  const activeChannel: Channel = isBulk ? "EMAIL" : channel

  function openWhatsapp() {
    const scheduleId = scheduleIds[0]
    if (!scheduleId) return
    // La traccia parte qui e non aspetta: il link si apre comunque, e la
    // riga si aggiorna quando il server ha registrato
    void recordWhatsappReminder(scheduleId).then((result) => {
      if (result.ok) router.refresh()
    })
    onSent?.()
    onOpenChange(false)
  }

  const templateSelect = (
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
  )

  // La forma (due canali, anteprima, testo per WhatsApp) è condivisa con la
  // richiesta del certificato: qui restano i modelli e l'invio dei solleciti
  return (
    <TwoChannelReminderDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Sollecita"
      description={
        isBulk
          ? `Una email per famiglia, con l'elenco delle rate: ${families} ${families === 1 ? "famiglia" : "famiglie"} per ${count} scadenze.`
          : activeChannel === "WHATSAPP"
            ? "Si apre WhatsApp con il messaggio già scritto: l'invio lo fai tu."
            : "Verrà inviata 1 email al contatto della famiglia."
      }
      isBulk={isBulk}
      channel={channel}
      onChannelChange={setChannel}
      preview={preview}
      previewError={previewError}
      isLoadingPreview={isLoadingPreview}
      whatsappText={whatsappText}
      onWhatsappTextChange={setWhatsappText}
      onWhatsappOpened={openWhatsapp}
      onSendEmail={handleSend}
      isSending={isSending}
      canSendEmail={
        !!templateSlug && !templatesEmpty && count > 0 && !previewError
      }
      sendLabel={families === 1 ? "Invia email" : `Invia ${families} email`}
      beforePreview={templateSelect}
    />
  )
}
