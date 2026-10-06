import { Badge } from "@/components/ui/badge"
import type { AccessStatus } from "@/lib/auth/access-status-types"
import { statusTone, TONE_BADGE } from "@/lib/status/tone"
import { cn } from "@/lib/utils"

// Timezone esplicita: il badge è renderizzato sia sul server (UTC) sia nel
// browser, e senza timeZone le date vicino a mezzanotte cambierebbero giorno.
const DATE_IT_ROME = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Europe/Rome",
})

export function formatAccessDate(date: Date): string {
  return DATE_IT_ROME.format(date)
}

const LABELS: Record<AccessStatus["kind"], string> = {
  NO_EMAIL: "Senza email",
  NEVER_INVITED: "Mai invitato",
  INVITED: "Invitato",
  ACTIVE: "Attivo",
}

// Ambra solo su "mai invitato", ed è il token condiviso: è l'unico stato da
// sistemare. Blu e verde dicono "informazione" e "a posto", non sono stati
// di allerta.
const CLASSES: Record<AccessStatus["kind"], string> = {
  NO_EMAIL:
    "border-gray-400/40 bg-gray-500/10 text-gray-700 dark:text-gray-300",
  NEVER_INVITED: TONE_BADGE[statusTone({ kind: "access", invited: false })],
  INVITED:
    "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  ACTIVE:
    "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400",
}

export function accessStatusDetail(status: AccessStatus): string | null {
  switch (status.kind) {
    case "INVITED":
      return `inviato il ${formatAccessDate(status.invitedAt)}`
    case "ACTIVE":
      return status.lastSignInAt
        ? `ultimo accesso ${formatAccessDate(status.lastSignInAt)}`
        : null
    default:
      return null
  }
}

type Props = {
  status: AccessStatus
  showDetail?: boolean
  className?: string
}

export function AccessStatusBadge({ status, showDetail = true, className }: Props) {
  const detail = showDetail ? accessStatusDetail(status) : null

  return (
    <div className={cn("flex flex-col items-start gap-0.5", className)}>
      <Badge variant="outline" className={CLASSES[status.kind]}>
        {LABELS[status.kind]}
      </Badge>
      {detail ? (
        <span className="text-xs text-muted-foreground">{detail}</span>
      ) : null}
      {status.kind === "INVITED" && status.deliveryProblem ? (
        // Rosso: l'email è tornata indietro, la famiglia non è raggiungibile
        <span className="text-xs text-status-block">email non consegnata</span>
      ) : null}
    </div>
  )
}
