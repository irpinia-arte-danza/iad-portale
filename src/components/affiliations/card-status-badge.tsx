import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { CardStatus } from "@/lib/affiliations/card-status"

// Badge stato tessera dell'ente. Gemello di CertStatusBadge, con le parole al
// femminile ("Valida") e senza rosso sull'assenza: una tessera che manca è un
// tesseramento da fare, non un blocco all'accesso in sala come il certificato.
export function CardStatusBadge({ status }: { status: CardStatus }) {
  if (status === "valid") {
    return (
      <Badge className="gap-1 bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100">
        <CheckCircle2 className="h-3 w-3" />
        Valida
      </Badge>
    )
  }
  if (status === "expiring") {
    return (
      <Badge className="gap-1 bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
        <AlertTriangle className="h-3 w-3" />
        In scadenza
      </Badge>
    )
  }
  if (status === "expired") {
    return (
      <Badge variant="destructive" className="gap-1">
        <ShieldAlert className="h-3 w-3" />
        Scaduta
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="gap-1">
      <ShieldAlert className="h-3 w-3" />
      Assente
    </Badge>
  )
}
