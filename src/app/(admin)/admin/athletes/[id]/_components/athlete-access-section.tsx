import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { AccessStatus } from "@/lib/auth/access-status-types"

import { AccessStatusBadge } from "../../../_components/access/access-status-badge"
import { SendAccessButton } from "../../../_components/access/send-access-button"

type Props = {
  athleteId: string
  status: AccessStatus
}

// Compare solo sulle allieve maggiorenni senza genitori collegati: per tutte
// le altre l'accesso è quello del genitore, e questa sezione non ha senso.
// Il gesto è lo stesso della scheda genitore: badge di stato a sinistra,
// "Invia accesso" a destra.
export function AthleteAccessSection({ athleteId, status }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Accesso all&apos;area riservata</CardTitle>
        <CardDescription>
          Maggiorenne e senza genitori collegati: l&apos;accesso è suo. Riceverà
          un link personale per scegliere la password e potrà consultare
          contributi, ricevute, presenze e orari.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <AccessStatusBadge status={status} />
        <SendAccessButton
          kind="ATHLETE"
          profileId={athleteId}
          status={status}
        />
      </CardContent>
    </Card>
  )
}
