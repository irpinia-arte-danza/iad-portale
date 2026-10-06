import { AlertTriangle } from "lucide-react"

import { isAmountOffReference } from "@/lib/payments/reduced-collection"
import { formatEur } from "@/lib/utils/format"

type Props = {
  amountCents: number
  // Importo "di listino": la quota mensile del corso. null dove non esiste.
  referenceAmountCents: number | null
  isPaid: boolean
  className?: string
}

// Segno accanto all'importo di una scadenza ancora da incassare, quando è
// diverso dalla quota del corso.
//
// Nasce da un caso vero: una mensile rimasta a 20 € invece di 40 dopo un
// incasso ridotto finito sul mese sbagliato e poi annullato. È stata così per
// tre settimane e si è scoperto solo quando l'incasso pieno è stato rifiutato.
// Il segno serve a vederlo prima, non a bloccare niente.
//
// Niente tooltip al passaggio del mouse: Giuseppina lavora su iPad, dove non
// esiste. Il testo sta sempre a schermo, il `title` è solo un'aggiunta.
export function AmountOffReference({
  amountCents,
  referenceAmountCents,
  isPaid,
  className,
}: Props) {
  if (!isAmountOffReference({ amountCents, referenceAmountCents, isPaid })) {
    return null
  }

  return (
    <span
      className={
        // Ambra: da sistemare, non blocca niente (stesso token dei chip)
        "inline-flex items-center gap-1 text-xs text-status-fix" +
        (className ? ` ${className}` : "")
      }
      title={`La quota del corso è ${formatEur(referenceAmountCents ?? 0)}. Correggi con «Modifica importo».`}
    >
      <AlertTriangle className="h-3 w-3 shrink-0" />
      quota {formatEur(referenceAmountCents ?? 0)}
    </span>
  )
}
