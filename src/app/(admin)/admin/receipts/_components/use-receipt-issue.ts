"use client"

import { unstable_rethrow } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import type {
  IssuedReceiptInfo,
  ReceiptIssuePreview,
} from "@/lib/receipts/types"

import { getReceiptIssuePreview, issueReceipt } from "../actions"

export type ReceiptIssueState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "preview"; preview: ReceiptIssuePreview }
  | { phase: "issuing"; preview: ReceiptIssuePreview }
  | {
      phase: "issued"
      receipt: IssuedReceiptInfo
      alreadyIssued: boolean
    }

// Flusso "Emetti ricevuta" guidato da eventi (niente fetch in useEffect):
// begin → anteprima (intestatario e dati mancanti) → confirm → emessa.
// Se la conferma fallisce per la rete dopo che il server ha emesso, un nuovo
// confirm restituisce la ricevuta già emessa: nessun doppio numero.
export function useReceiptIssue() {
  const [state, setState] = useState<ReceiptIssueState>({ phase: "idle" })

  async function begin(paymentId: string) {
    setState({ phase: "loading" })
    try {
      const result = await getReceiptIssuePreview(paymentId)
      if (!result.ok) {
        setState({ phase: "error", message: result.error })
        return
      }
      const { preview } = result
      if (preview.existing) {
        setState({ phase: "issued", receipt: preview.existing, alreadyIssued: true })
      } else {
        setState({ phase: "preview", preview })
      }
    } catch (error) {
      unstable_rethrow(error)
      setState({
        phase: "error",
        message: "Connessione non riuscita: controlla la rete e riprova.",
      })
    }
  }

  async function confirm() {
    if (state.phase !== "preview") return
    const { preview } = state
    setState({ phase: "issuing", preview })
    try {
      const result = await issueReceipt(preview.paymentId)
      if (!result.ok) {
        toast.error(result.error)
        setState({ phase: "preview", preview })
        return
      }
      if (!result.alreadyIssued) {
        toast.success(`Ricevuta n. ${result.receipt.receiptNumber} emessa`)
      }
      setState({
        phase: "issued",
        receipt: result.receipt,
        alreadyIssued: result.alreadyIssued,
      })
    } catch (error) {
      unstable_rethrow(error)
      toast.error("Emissione non riuscita: controlla la connessione e riprova")
      setState({ phase: "preview", preview })
    }
  }

  function reset() {
    setState({ phase: "idle" })
  }

  return { state, begin, confirm, reset }
}
