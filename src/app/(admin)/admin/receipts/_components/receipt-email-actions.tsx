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
} from "@/lib/receipts/receipt-email"
import { NEVER_SHARED, shareStateLabel } from "@/lib/receipts/receipt-share"
import { receiptPdfDownloadHref, receiptPdfHref } from "@/lib/receipts/types"
import { formatDateShort } from "@/lib/utils/format"

import {
  getReceiptDeliveryInfo,
  sendReceiptByEmail,
  type ReceiptDeliveryInfo,
} from "../actions"
import { ShareReceiptButton } from "./share-receipt-button"

const NOTHING_YET: ReceiptDeliveryInfo = {
  email: NEVER_SENT,
  share: NEVER_SHARED,
}

type Props = {
  receiptId: string
  receiptNumber: string
  athleteName: string
  status: ReceiptStatus
  payerName: string | null
  payerEmail: string | null
}

// Stato dell'invio e azioni sulla singola ricevuta: usato nel pannello del
// pagamento, dove la ricevuta si consulta una alla volta. Lo stato si carica
// all'apertura, così non serve passarlo attraverso la query del pagamento.
export function ReceiptEmailActions({
  receiptId,
  receiptNumber,
  athleteName,
  status,
  payerName,
  payerEmail,
}: Props) {
  const [info, setInfo] = useState<ReceiptDeliveryInfo | null>(null)
  const [sending, setSending] = useState(false)

  const blocker = receiptEmailBlocker({ status, payerName, payerEmail })

  useEffect(() => {
    let alive = true
    getReceiptDeliveryInfo(receiptId)
      .then((loaded) => {
        if (alive) setInfo(loaded ?? NOTHING_YET)
      })
      .catch(() => {
        if (alive) setInfo(NOTHING_YET)
      })
    return () => {
      alive = false
    }
  }, [receiptId])

  function reload() {
    void getReceiptDeliveryInfo(receiptId)
      .then((loaded) => setInfo(loaded ?? NOTHING_YET))
      .catch(() => {
        // Lo stato mostrato resta quello di prima: non è un errore da
        // segnalare, l'azione è comunque avvenuta
      })
  }

  async function send() {
    setSending(true)
    try {
      const result = await sendReceiptByEmail(receiptId)
      if (result.ok) {
        toast.success(`Ricevuta inviata a ${result.recipient}`)
        reload()
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

  const email = info?.email ?? null
  const sent = email ? wasSent(email) : false
  // Riga a sé: dice quel poco che si sa di una condivisione, cioè che il
  // documento è uscito di qui e quando. Mai al posto dello stato di invio.
  const shared = info ? shareStateLabel(info.share) : null

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {email === null
          ? "…"
          : blocker
            ? blocker
            : sent
              ? `Inviata il ${formatDateShort(email.lastSentAt!)} a ${email.lastRecipient}${
                  email.sendCount > 1 ? ` · ${email.sendCount} invii` : ""
                }`
              : `Non ancora inviata${payerEmail ? ` · ${payerEmail}` : ""}`}
      </p>
      {shared ? (
        <p className="text-xs text-muted-foreground">{shared}</p>
      ) : null}

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
        {/* Compare solo dove il browser condivide file (iPad, iPhone) */}
        <ShareReceiptButton
          receiptId={receiptId}
          receiptNumber={receiptNumber}
          athleteName={athleteName}
          onShared={reload}
        />
        <Button
          className="min-h-11 flex-1"
          onClick={send}
          disabled={sending || blocker !== null || email === null}
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : sent ? (
            <RefreshCw className="h-4 w-4" />
          ) : (
            <Mail className="h-4 w-4" />
          )}
          {sending ? "Invio…" : email ? sendButtonLabel(email) : "Invia per email"}
        </Button>
      </div>
    </div>
  )
}
