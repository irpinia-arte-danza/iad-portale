import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { CertStatus } from "@/lib/medical-certificates/certificate-status"
import { statusTone, TONE_BADGE } from "@/lib/status/tone"
import { cn } from "@/lib/utils"

// Badge stato certificato, usato ovunque: riepilogo certificati, lista
// allieve, scheda. Il colore lo decide statusTone — mancante e scaduto
// bloccano la lezione, quindi sono rossi dappertutto, senza eccezioni per
// pagina.
export function CertStatusBadge({ status }: { status: CertStatus }) {
  const tone = statusTone({ kind: "certificate", status })

  if (status === "valid") {
    return (
      <Badge variant="outline" className="gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Valido
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className={cn("gap-1", TONE_BADGE[tone])}>
      {status === "expiring" ? (
        <AlertTriangle className="h-3 w-3" />
      ) : (
        <ShieldAlert className="h-3 w-3" />
      )}
      {status === "expiring"
        ? "In scadenza"
        : status === "expired"
          ? "Scaduto"
          : "Mancante"}
    </Badge>
  )
}
