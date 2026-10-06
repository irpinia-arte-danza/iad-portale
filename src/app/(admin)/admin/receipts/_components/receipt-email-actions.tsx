"use client"

import { unstable_rethrow } from "next/navigation"
import { useEffect, useState } from "react"
import { Download, HandCoins, Loader2, Mail, Printer, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import type { ReceiptStatus } from "@prisma/client"

import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
  markReceiptDeliveredByHand,
  sendReceiptByEmail,
  type ReceiptDeliveryInfo,
} from "../actions"
import { ShareReceiptButton } from "./share-receipt-button"
import { useFileShareSupport } from "./use-file-share-support"

const NOTHING_YET: ReceiptDeliveryInfo = {
  email: NEVER_SENT,
  share: NEVER_SHARED,
  handDeliveredAt: null,
}

type Props = {
  receiptId: string
  receiptNumber: string
  athleteName: string
  status: ReceiptStatus
  payerName: string | null
  payerEmail: string | null
}

// Stato dell'invio e azioni sulla singola ricevuta: subito dopo l'emissione e
// nel pannello del pagamento. Lo stato si carica all'apertura, così non serve
// passarlo attraverso la query del pagamento.
//
// L'ordine di rilievo dei tasti segue il mezzo con cui la ricevuta viene
// consegnata davvero: da iPad è WhatsApp, quindi dove il browser condivide
// file "Condividi" è il tasto pieno e l'email passa a outline. Su desktop,
// dove la condivisione di file non c'è, l'email resta il tasto pieno.
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
  const [handOpen, setHandOpen] = useState(false)
  const [marking, setMarking] = useState(false)
  const canShareFiles = useFileShareSupport()

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

  async function markByHand() {
    setMarking(true)
    try {
      const result = await markReceiptDeliveredByHand(receiptId)
      if (result.ok) {
        toast.success(`Ricevuta n. ${receiptNumber} segnata come consegnata`)
        setHandOpen(false)
        reload()
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      unstable_rethrow(error)
      toast.error("Non è stato possibile segnarla: riprova")
    } finally {
      setMarking(false)
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
      {info?.handDeliveredAt ? (
        <p className="text-xs text-muted-foreground">
          Consegnata a mano il {formatDateShort(info.handDeliveredAt)}
        </p>
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
        {/* Compare solo dove il browser condivide file (iPad, iPhone), e lì
            è l'azione principale */}
        <ShareReceiptButton
          receiptId={receiptId}
          receiptNumber={receiptNumber}
          athleteName={athleteName}
          buttonVariant={canShareFiles ? "default" : "outline"}
          onShared={reload}
        />
        <Button
          variant={canShareFiles ? "outline" : "default"}
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

      {/* Vale per tutte, non solo per quelle senza email: una ricevuta
          stampata e data allo sportello è consegnata, e il gestionale non
          può saperlo da solo */}
      {status !== "CANCELLED" ? (
        <Button
          variant="ghost"
          size="sm"
          className="min-h-11 w-full text-muted-foreground"
          onClick={() => setHandOpen(true)}
        >
          <HandCoins className="h-4 w-4" />
          Consegnata a mano
        </Button>
      ) : null}

      <AlertDialog open={handOpen} onOpenChange={setHandOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Hai consegnato la ricevuta n. {receiptNumber} a mano?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Resta scritto che è uscita dal gestionale oggi, e la ricevuta
              esce dall&apos;elenco di quelle da consegnare. Il documento non
              cambia.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={marking}>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={markByHand} disabled={marking}>
              {marking ? "Salvataggio…" : "Sì, consegnata"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
