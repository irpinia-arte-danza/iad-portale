"use client"

import { unstable_rethrow } from "next/navigation"
import { useEffect, useState } from "react"
import { Download, Loader2, Mail, Printer, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import type { ReceiptStatus } from "@prisma/client"

import { Button } from "@/components/ui/button"
import {
  NEVER_SENT,
  receiptEmailBlocker,
  sendButtonLabel,
  wasSent,
  type ReceiptEmailState,
} from "@/lib/receipts/receipt-email"
import { receiptPdfDownloadHref, receiptPdfHref } from "@/lib/receipts/types"
import { formatDateShort } from "@/lib/utils/format"

import { getReceiptEmailInfo, sendReceiptByEmail } from "../actions"

type Props = {
  receiptId: string
  status: ReceiptStatus
  payerName: string | null
  payerEmail: string | null
}

// Stato dell'invio e azioni sulla singola ricevuta: usato nel pannello del
// pagamento, dove la ricevuta si consulta una alla volta. Lo stato si carica
// all'apertura, così non serve passarlo attraverso la query del pagamento.
export function ReceiptEmailActions({
  receiptId,
  status,
  payerName,
  payerEmail,
}: Props) {
  const [state, setState] = useState<ReceiptEmailState | null>(null)
  const [sending, setSending] = useState(false)

  const blocker = receiptEmailBlocker({ status, payerName, payerEmail })

  useEffect(() => {
    let alive = true
    getReceiptEmailInfo(receiptId)
      .then((loaded) => {
        if (alive) setState(loaded ?? NEVER_SENT)
      })
      .catch(() => {
        if (alive) setState(NEVER_SENT)
      })
    return () => {
      alive = false
    }
  }, [receiptId])

  async function send() {
    setSending(true)
    try {
      const result = await sendReceiptByEmail(receiptId)
      if (result.ok) {
        toast.success(`Ricevuta inviata a ${result.recipient}`)
        setState(await getReceiptEmailInfo(receiptId))
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      // requireAdmin può fare redirect (sessione scaduta): non è un errore
      unstable_rethrow(error)
      toast.error("Invio non riuscito: controlla la connessione e riprova")
    } finally {
      setSending(false)
    }
  }

  const sent = state ? wasSent(state) : false

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {state === null
          ? "…"
          : blocker
            ? blocker
            : sent
              ? `Inviata il ${formatDateShort(state.lastSentAt!)} a ${state.lastRecipient}${
                  state.sendCount > 1 ? ` · ${state.sendCount} invii` : ""
                }`
              : `Non ancora inviata${payerEmail ? ` · ${payerEmail}` : ""}`}
      </p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button asChild variant="outline" className="min-h-11 flex-1">
          <a href={receiptPdfHref(receiptId)} target="_blank" rel="noopener noreferrer">
            <Printer className="h-4 w-4" />
            Apri
          </a>
        </Button>
        <Button asChild variant="outline" className="min-h-11 flex-1">
          <a href={receiptPdfDownloadHref(receiptId)}>
            <Download className="h-4 w-4" />
            Scarica
          </a>
        </Button>
        <Button
          className="min-h-11 flex-1"
          onClick={send}
          disabled={sending || blocker !== null || state === null}
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : sent ? (
            <RefreshCw className="h-4 w-4" />
          ) : (
            <Mail className="h-4 w-4" />
          )}
          {sending ? "Invio…" : state ? sendButtonLabel(state) : "Invia per email"}
        </Button>
      </div>
    </div>
  )
}
