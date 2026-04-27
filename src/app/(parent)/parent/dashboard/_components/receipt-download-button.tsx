"use client"

import * as React from "react"
import { Download, FileText, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

import { generatePaymentReceipt } from "../../_actions/receipt"

type Props = {
  paymentId: string
  receiptNumber: string | null
}

export function ReceiptDownloadButton({ paymentId, receiptNumber }: Props) {
  const [busy, setBusy] = React.useState(false)

  async function onClick() {
    setBusy(true)
    try {
      const result = await generatePaymentReceipt(paymentId)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      if (!result.data) {
        toast.error("Risposta server vuota")
        return
      }
      const { base64, filename } = result.data
      // Decode base64 → Blob → trigger download
      const binary = atob(base64)
      const len = binary.length
      const bytes = new Uint8Array(len)
      for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i)
      const blob = new Blob([bytes], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("[receipt download]", error)
      toast.error("Errore download ricevuta")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="min-h-11 gap-2"
      onClick={onClick}
      disabled={busy}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : receiptNumber ? (
        <FileText className="h-4 w-4" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      <span>{receiptNumber ?? "Ricevuta"}</span>
    </Button>
  )
}
