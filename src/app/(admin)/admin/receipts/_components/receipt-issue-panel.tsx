"use client"

import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileText,
  Info,
  Loader2,
  Printer,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { isTraceablePaymentMethod } from "@/lib/payments/traceability"
import { receiptPdfHref, receiptPreviewPdfHref } from "@/lib/receipts/types"
import { PAYMENT_METHOD_LABELS } from "@/lib/schemas/payment"
import { formatDateShort, formatEur } from "@/lib/utils/format"

import type { ReceiptIssueState } from "./use-receipt-issue"

type Props = {
  state: ReceiptIssueState
  onConfirm: () => void
  onClose: () => void
  // Etichetta del bottone di uscita prima dell'emissione
  dismissLabel?: string
}

export function ReceiptIssuePanel({
  state,
  onConfirm,
  onClose,
  dismissLabel = "Annulla",
}: Props) {
  if (state.phase === "idle") return null

  if (state.phase === "loading") {
    return (
      <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Preparazione della ricevuta…
      </p>
    )
  }

  if (state.phase === "error") {
    return (
      <div className="space-y-4">
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {state.message}
        </p>
        <div className="flex justify-end">
          <Button variant="outline" className="min-h-11" onClick={onClose}>
            Chiudi
          </Button>
        </div>
      </div>
    )
  }

  if (state.phase === "issued") {
    const cancelled = state.receipt.status === "CANCELLED"
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-emerald-300 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100">
          <p className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {state.alreadyIssued ? "Ricevuta già emessa" : "Ricevuta emessa"}
          </p>
          <p className="mt-2 font-mono text-lg font-semibold">
            n. {state.receipt.receiptNumber}
          </p>
          <p className="text-sm">
            emessa il {formatDateShort(state.receipt.issueDate)}
          </p>
          {state.alreadyIssued ? (
            <p className="mt-2 text-xs">
              La ristampa usa lo stesso numero e la stessa data di emissione.
            </p>
          ) : null}
          {cancelled ? (
            <Badge variant="destructive" className="mt-2">
              Annullata
            </Badge>
          ) : null}
        </div>
        {state.pdfDeferred ? (
          <p className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            La ricevuta è emessa, ma l&apos;archivio dei PDF non ha risposto. Il
            PDF viene archiviato alla prima apertura o entro la notte: puoi
            aprirlo e stamparlo subito.
          </p>
        ) : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" className="min-h-11" onClick={onClose}>
            Chiudi
          </Button>
          <Button asChild className="min-h-11">
            <a
              href={receiptPdfHref(state.receipt.id)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Printer className="h-4 w-4" />
              {cancelled ? "Apri ricevuta annullata" : "Apri e stampa PDF"}
            </a>
          </Button>
        </div>
      </div>
    )
  }

  // preview | issuing
  const { preview } = state
  const issuing = state.phase === "issuing"
  const traceable = isTraceablePaymentMethod(preview.paymentMethod)
  const methodLabel = PAYMENT_METHOD_LABELS[preview.paymentMethod]
  const previewHref = receiptPreviewPdfHref(preview.paymentId)

  return (
    <div className="space-y-4">
      {preview.blocker ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {preview.blocker}
        </p>
      ) : (
        <div className="space-y-2">
          {/* Il documento che verrà emesso: stessi dati e stesso PDF, con il
              numero previsto e la filigrana ANTEPRIMA */}
          <div className="overflow-hidden rounded-md border bg-muted/30">
            <iframe
              title="Anteprima della ricevuta"
              src={`${previewHref}#toolbar=0&navpanes=0&view=FitH`}
              className="block h-[420px] w-full sm:h-[520px]"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-3 text-xs text-muted-foreground">
            <span>
              {preview.athleteName} ·{" "}
              <span className="font-mono tabular-nums">
                {formatEur(preview.amountCents)}
              </span>{" "}
              · intestata a {preview.payer.name}
            </span>
            <a
              href={previewHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-1 font-medium text-foreground underline underline-offset-4"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Apri a schermo intero
            </a>
          </div>
        </div>
      )}

      {preview.warnings.length > 0 ? (
        <div className="space-y-1 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="flex items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Da controllare prima di emettere
          </p>
          <ul className="list-disc space-y-1 pl-5">
            {preview.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {traceable ? (
        <p className="flex gap-2 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          Pagamento tracciabile ({methodLabel}) → la ricevuta riporta la
          dicitura di detraibilità.
        </p>
      ) : (
        <p className="flex gap-2 rounded-md border border-sky-300 bg-sky-50 p-3 text-sm text-sky-900 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-100">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          {preview.paymentMethod === "CASH"
            ? "Pagamento in contanti"
            : `Metodo di pagamento "${methodLabel}"`}{" "}
          → la ricevuta non riporterà la dicitura di detraibilità, solo il
          metodo di pagamento.
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        Il numero viene assegnato adesso e non si può cancellare. I dati
        dell&apos;anteprima restano fissati sulla ricevuta: se c&apos;è un
        errore, si storna il pagamento e la ricevuta risulta annullata.
      </p>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          variant="outline"
          className="min-h-11"
          onClick={onClose}
          disabled={issuing}
        >
          {dismissLabel}
        </Button>
        <Button
          className="min-h-11"
          onClick={onConfirm}
          disabled={issuing || preview.blocker !== null}
        >
          {issuing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          {issuing ? "Emissione…" : "Emetti ricevuta"}
        </Button>
      </div>
    </div>
  )
}
