import { AlertTriangle } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type {
  AccessProfileKind,
  AccessStatus,
} from "@/lib/auth/access-status-types"

import { AccessStatusBadge, formatAccessDate } from "./access-status-badge"
import { SendAccessButton } from "./send-access-button"

type Props = {
  kind: AccessProfileKind
  profileId: string
  status: AccessStatus
}

function describe(kind: AccessProfileKind, status: AccessStatus): string {
  const who = kind === "PARENT" ? "Il genitore" : "L'insegnante"
  const editHint =
    kind === "PARENT" ? "Modifica il genitore" : "Modifica l'insegnante"

  switch (status.kind) {
    case "NO_EMAIL":
      return `Per inviare l'accesso serve un indirizzo email. ${editHint} e aggiungila.`
    case "NEVER_INVITED":
      return kind === "PARENT"
        ? "Non ha ancora ricevuto l'email di accesso. Inviala quando i dati (figlie, iscrizioni, quote) sono completi."
        : "Non ha ancora ricevuto l'email di accesso. Inviala quando i corsi sono assegnati."
    case "INVITED":
      return `Email di accesso inviata il ${formatAccessDate(status.invitedAt)}, password non ancora scelta. Se il link è scaduto o l'email non è arrivata, reinvia: il link precedente smetterà di funzionare.`
    case "ACTIVE":
      return `${who} ha attivato l'accesso${
        status.lastSignInAt
          ? ` (ultimo accesso ${formatAccessDate(status.lastSignInAt)})`
          : ""
      }. Se dimentica la password può usare «Password dimenticata» nella pagina di accesso.`
  }
}

export function AccessStatusCard({ kind, profileId, status }: Props) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Accesso all&apos;area riservata</CardTitle>
            <CardDescription>
              {kind === "PARENT" ? "Area genitori" : "Area insegnanti"}
            </CardDescription>
          </div>
          <AccessStatusBadge status={status} showDetail={false} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{describe(kind, status)}</p>
          {status.kind === "INVITED" && status.deliveryProblem ? (
            <p className="flex items-start gap-2 text-sm text-red-700 dark:text-red-400">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              L&apos;ultima email risulta non consegnata: controlla che
              l&apos;indirizzo sia corretto prima di reinviare.
            </p>
          ) : null}
        </div>
        <SendAccessButton
          kind={kind}
          profileId={profileId}
          status={status}
          size="default"
          className="shrink-0"
        />
      </CardContent>
    </Card>
  )
}
