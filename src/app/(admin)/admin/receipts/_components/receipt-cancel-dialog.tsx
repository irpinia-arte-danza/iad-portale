"use client"

import Link from "next/link"

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

// ─────────────────────────────────────────────────────────────────────────
// "Annulla ricevuta" non esiste come azione a sé, ed è voluto: una ricevuta
// si annulla stornando il pagamento, dentro la stessa transazione
// (cancelReceiptForPayment). Annullarla da sola lascerebbe un pagamento
// incassato senza documento, e il numero resterebbe appeso.
//
// Il dialog quindi non annulla: ripete il numero, dice dove si fa davvero e
// ci porta. Meglio una strada sola, spiegata, che due che divergono.
// ─────────────────────────────────────────────────────────────────────────
export function ReceiptCancelDialog({
  receiptNumber,
  athleteName,
  athleteId,
  open,
  onOpenChange,
}: {
  receiptNumber: string
  athleteName: string | null
  athleteId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Annullare la ricevuta n. {receiptNumber}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Una ricevuta si annulla stornando il pagamento a cui è legata
            {athleteName ? ` (${athleteName})` : ""}: il numero resta, il
            documento risulta annullato e la famiglia non ha un incasso senza
            ricevuta. Si fa dai contributi dell&apos;allieva.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Chiudi</AlertDialogCancel>
          {athleteId ? (
            <AlertDialogAction asChild>
              <Link href={`/admin/athletes/${athleteId}?tab=contributi`}>
                Vai ai contributi
              </Link>
            </AlertDialogAction>
          ) : null}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
