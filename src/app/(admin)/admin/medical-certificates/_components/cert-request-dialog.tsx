"use client"

import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState, useTransition } from "react"
import { toast } from "sonner"

import {
  TwoChannelReminderDialog,
  type ReminderChannel,
} from "@/components/reminders/two-channel-dialog"
import { planCertRequests } from "@/lib/medical-certificates/request-plan"

import {
  previewCertRequest,
  recordCertWhatsappRequest,
  sendCertRequests,
  type CertRequestPreview,
} from "../actions"
import type { AthleteCertRow } from "../queries"

// ─────────────────────────────────────────────────────────────────────────
// "Chiedi al genitore": la richiesta del certificato, a una famiglia o a più.
//
// Stesso dialog a due canali dei solleciti dei contributi. Il testo non si
// sceglie: lo decide lo stato del certificato (mancante, oppure scaduto / in
// scadenza). Con una allieva si può mandare su WhatsApp o per email; con più
// d'una solo per email, una per famiglia per i mancanti.
//
// Il componente si monta quando si apre (chi lo usa gli dà una `key`): lo
// stato parte pulito ogni volta, senza azzerarlo in un effetto.
// ─────────────────────────────────────────────────────────────────────────

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Le allieve per cui si chiede: una (dalla riga) o più (dalla selezione)
  targets: AthleteCertRow[]
  onSent?: () => void
}

export function CertRequestDialog({
  open,
  onOpenChange,
  targets,
  onSent,
}: Props) {
  const router = useRouter()
  const [preview, setPreview] = useState<CertRequestPreview | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [isLoadingPreview, startLoadingPreview] = useTransition()
  const [isSending, startSending] = useTransition()
  const [channel, setChannel] = useState<ReminderChannel>("WHATSAPP")
  const [whatsappText, setWhatsappText] = useState("")

  const isBulk = targets.length > 1

  // Di gruppo parte solo l'email: restano dentro le allieve a cui si può
  // scrivere e che hanno qualcosa da chiedere. Le altre si elencano col
  // motivo, prima di premere Invia.
  const sendable = useMemo(
    () => targets.filter((t) => t.emailBlocker === null && t.status !== "valid"),
    [targets],
  )
  const skipped = useMemo(
    () =>
      targets
        .filter((t) => !sendable.includes(t))
        .map((t) => ({
          id: t.athleteId,
          name: t.athleteName,
          reason:
            t.status === "valid"
              ? "certificato valido"
              : (t.emailBlocker ?? "non raggiungibile"),
        })),
    [targets, sendable],
  )
  const plan = useMemo(
    () =>
      planCertRequests(
        sendable.map((t) => ({
          athleteId: t.athleteId,
          athleteName: t.athleteFullName,
          status: t.status,
          recipientKey: t.recipientKey,
        })),
      ),
    [sendable],
  )

  // L'anteprima è della prima email del gruppo (o dell'unica allieva): con
  // i nomi di tutte le figlie che quella email riguarda
  const firstEmail = plan.emails[0]
  const previewTargetId = isBulk
    ? firstEmail?.athleteIds[0]
    : targets[0]?.athleteId
  const previewGroupKey = isBulk ? (firstEmail?.athleteIds.join(",") ?? "") : ""

  useEffect(() => {
    if (!open || !previewTargetId) return
    startLoadingPreview(async () => {
      const result = await previewCertRequest(
        previewTargetId,
        previewGroupKey ? previewGroupKey.split(",") : [],
      )
      if (!result.ok) {
        setPreview(null)
        setPreviewError(result.error)
        return
      }
      setPreviewError(null)
      setPreview(result.preview)
      setWhatsappText(result.preview.whatsappText)
      // WhatsApp se c'è il numero: è il canale che Giuseppina usa già
      setChannel(result.preview.recipientPhone ? "WHATSAPP" : "EMAIL")
    })
  }, [open, previewTargetId, previewGroupKey])

  function handleSend() {
    const ids = (isBulk ? sendable : targets).map((t) => t.athleteId)
    if (ids.length === 0) return
    startSending(async () => {
      try {
        const response = await sendCertRequests(ids)
        const { sent, failed, skipped: skippedCount } = response.summary
        if (response.transportError && sent === 0) {
          toast.error(`Invio fallito: ${response.transportError}`)
          return
        }
        const parts: string[] = []
        if (sent > 0) parts.push(`${sent} inviate`)
        if (failed > 0) parts.push(`${failed} fallite`)
        if (skippedCount > 0) parts.push(`${skippedCount} saltate`)
        const summary = parts.join(" · ") || "Nessuna email inviata"
        if (sent > 0 && failed === 0 && skippedCount === 0) toast.success(summary)
        else if (sent > 0) toast.warning(summary)
        else toast.error(summary)

        onSent?.()
        onOpenChange(false)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Errore durante l'invio")
      }
    })
  }

  function openWhatsapp() {
    const athleteId = targets[0]?.athleteId
    if (!athleteId) return
    // La traccia parte e non aspetta: il link si apre comunque, e la riga si
    // aggiorna quando il server ha registrato
    void recordCertWhatsappRequest(athleteId).then((result) => {
      if (result.ok) router.refresh()
    })
    onSent?.()
    onOpenChange(false)
  }

  const emails = plan.emails.length
  const description = isBulk
    ? `${emails} email a ${plan.families} ${plan.families === 1 ? "famiglia" : "famiglie"}: i certificati mancanti di una stessa famiglia stanno in una sola.`
    : channel === "WHATSAPP" && preview?.recipientPhone
      ? "Si apre WhatsApp con il messaggio già scritto: l'invio lo fai tu."
      : "Verrà inviata 1 email al contatto della famiglia."

  const bulkSummary = isBulk ? (
    <div className="space-y-2 text-sm">
      {skipped.length > 0 ? (
        <div>
          <p className="mb-1 font-medium">
            Non ricevono niente ({skipped.length})
          </p>
          <ul className="max-h-32 space-y-1 overflow-y-auto rounded-md border p-2 text-muted-foreground">
            {skipped.map((entry) => (
              <li key={entry.id} className="flex justify-between gap-2">
                <span className="truncate">{entry.name}</span>
                <span className="shrink-0 text-xs">{entry.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  ) : null

  return (
    <TwoChannelReminderDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        isBulk
          ? `Chiedi a ${plan.families} ${plan.families === 1 ? "famiglia" : "famiglie"}`
          : "Chiedi al genitore"
      }
      description={description}
      isBulk={isBulk}
      channel={channel}
      onChannelChange={setChannel}
      preview={preview}
      previewError={
        isBulk && sendable.length === 0
          ? "Nessuna delle allieve selezionate ha un contatto a cui scrivere."
          : previewError
      }
      isLoadingPreview={isLoadingPreview}
      whatsappText={whatsappText}
      onWhatsappTextChange={setWhatsappText}
      onWhatsappOpened={openWhatsapp}
      onSendEmail={handleSend}
      isSending={isSending}
      canSendEmail={
        !previewError &&
        preview !== null &&
        !preview.warning &&
        (isBulk ? emails > 0 : true)
      }
      sendLabel={
        isBulk
          ? `Invia ${emails} email`
          : "Invia email"
      }
      beforePreview={bulkSummary}
      previewLabel={
        isBulk ? "Anteprima (prima famiglia)" : "Anteprima dell'email"
      }
    />
  )
}
