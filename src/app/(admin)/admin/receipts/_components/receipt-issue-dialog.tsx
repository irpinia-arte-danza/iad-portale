"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { ReceiptIssuePanel } from "./receipt-issue-panel"
import type { ReceiptIssueState } from "./use-receipt-issue"

type Props = {
  state: ReceiptIssueState
  onConfirm: () => void
  onClose: () => void
}

// Dialog di emissione/ristampa aperto dall'elenco o dal dettaglio pagamento.
// Aperto finché lo stato del flusso non torna "idle".
export function ReceiptIssueDialog({ state, onConfirm, onClose }: Props) {
  const open = state.phase !== "idle"
  const title =
    state.phase === "issued"
      ? state.alreadyIssued
        ? "Ristampa ricevuta"
        : "Ricevuta emessa"
      : "Emetti ricevuta"

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && state.phase !== "issuing") onClose()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {state.phase === "issued"
              ? "Apri il PDF per stamparlo o consegnarlo."
              : "Controlla intestatario e dati prima di assegnare il numero."}
          </DialogDescription>
        </DialogHeader>
        <ReceiptIssuePanel state={state} onConfirm={onConfirm} onClose={onClose} />
      </DialogContent>
    </Dialog>
  )
}
