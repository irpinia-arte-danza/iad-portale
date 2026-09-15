import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { CertStatus } from "@/lib/medical-certificates/certificate-status"

// Badge stato certificato dell'area admin: riepilogo certificati e lista allieve
export function CertStatusBadge({ status }: { status: CertStatus }) {
  if (status === "valid") {
    return (
      <Badge className="gap-1 bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100">
        <CheckCircle2 className="h-3 w-3" />
        Valido
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
        Scaduto
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="gap-1">
      <ShieldAlert className="h-3 w-3" />
      Mancante
    </Badge>
  )
}
