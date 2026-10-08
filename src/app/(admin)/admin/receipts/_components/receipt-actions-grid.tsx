import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────
// La disposizione dei tasti della ricevuta: Apri · Scarica · Condividi ·
// Invia per email.
//
// Stavano su una riga flex senza a capo, decisa dalla larghezza della
// FINESTRA (`sm:flex-row`). Ma lo stesso blocco vive anche nel pannello del
// pagamento, largo 448 px dentro una finestra da 1440: lì la riga non ci
// stava e «Invia per email» usciva dal riquadro.
//
// Qui decide la larghezza del CONTENITORE (container query): griglia 2×2
// finché è sotto 640 px — telefono, pannello laterale, dialog — e una riga
// da 640 in su, con flex-wrap come rete di sicurezza. Con tre tasti (dove il
// browser non condivide file «Condividi» non c'è) l'ultimo prende tutta la
// riga, così non resta una casella vuota.
// ─────────────────────────────────────────────────────────────────────────

export const RECEIPT_ACTION_CLASS =
  // h-11 fisso; min-w-0 perché la cella della griglia possa restringersi
  "h-11 min-w-0 @[40rem]:flex-1"

// L'ultimo tasto quando sono dispari
export const RECEIPT_ACTION_LAST_ODD_CLASS = "col-span-2 @[40rem]:col-span-1"

export function ReceiptActionsGrid({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className="@container">
      <div
        data-slot="receipt-actions"
        className={cn(
          "grid grid-cols-2 gap-2 @[40rem]:flex @[40rem]:flex-wrap",
          className,
        )}
      >
        {children}
      </div>
    </div>
  )
}
