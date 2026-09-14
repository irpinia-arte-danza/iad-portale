"use client"

import { AlertTriangle, CheckCircle2, FileText, Loader2, Printer } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { receiptPdfHref } from "@/lib/receipts/types"
import { FEE_TYPE_LABELS } from "@/lib/schemas/payment"
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

  return (
    <div className="space-y-4">
      <dl className="grid gap-2 rounded-md border p-3 text-sm">
        <div className="grid grid-cols-[110px_1fr] gap-2">
          <dt className="text-muted-foreground">Allieva</dt>
          <dd className="font-medium">{preview.athleteName}</dd>
        </div>
        <div className="grid grid-cols-[110px_1fr] gap-2">
          <dt className="text-muted-foreground">Importo</dt>
          <dd className="font-mono">
            {formatEur(preview.amountCents)} · {FEE_TYPE_LABELS[preview.feeType]}
          </dd>
        </div>
        <div className="grid grid-cols-[110px_1fr] gap-2">
          <dt className="text-muted-foreground">Intestata a</dt>
          <dd>
            <span className="font-medium">{preview.payer.name}</span>
            {preview.payer.fiscalCode ? (
              <span className="block font-mono text-xs text-muted-foreground">
                C.F. {preview.payer.fiscalCode}
              </span>
            ) : null}
            {preview.payer.address ? (
              <span className="block text-xs text-muted-foreground">
                {preview.payer.address}
              </span>
            ) : null}
          </dd>
        </div>
      </dl>

      {preview.blocker ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {preview.blocker}
        </p>
      ) : null}

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

      <p className="text-xs text-muted-foreground">
        Il numero viene assegnato adesso e non si può cancellare. I dati sopra
        restano fissati sulla ricevuta: se c&apos;è un errore, si storna il
        pagamento e la ricevuta risulta annullata.
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
