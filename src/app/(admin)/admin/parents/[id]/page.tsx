import Link from "next/link"
import { notFound } from "next/navigation"
import { UserRound } from "lucide-react"
import type { ParentRelationship } from "@prisma/client"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { EmailLogTable } from "../../_components/email-log/table"
import { getParentEmailLog } from "../../_components/email-log/queries"
import { ResourceContent } from "../../_components/resource-content"
import { ResourceHeader } from "../../_components/resource-header"
import { ParentAnagraficaDisplay } from "../_components/parent-anagrafica-display"
import { ParentDetailHeader } from "../_components/parent-detail-header"
import { ParentRelationEditButton } from "../_components/parent-relation-edit-button"
import { getParentById } from "../queries"
import { AccessStatusCard } from "../../_components/access/access-status-card"
import { getAccessStatus } from "@/lib/auth/access-status"

import { fullName } from "@/lib/utils/person-name"
const RELATIONSHIP_LABELS: Record<ParentRelationship, string> = {
  MOTHER: "Madre",
  FATHER: "Padre",
  GRANDPARENT: "Nonno/a",
  TUTOR: "Tutore",
  OTHER: "Altro",
}

const ATHLETE_STATUS_LABELS = {
  TRIAL: "Prova",
  ACTIVE: "Attiva",
  SUSPENDED: "Sospesa",
  WITHDRAWN: "Ritirata",
} as const

const ATHLETE_STATUS_VARIANTS: Record<
  keyof typeof ATHLETE_STATUS_LABELS,
  "default" | "secondary" | "destructive" | "outline"
> = {
  TRIAL: "secondary",
  ACTIVE: "default",
  SUSPENDED: "outline",
  WITHDRAWN: "destructive",
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ParentDetailPage({ params }: PageProps) {
  const resolvedParams = await params
  const [parent, emailLog] = await Promise.all([
    getParentById(resolvedParams.id),
    getParentEmailLog(resolvedParams.id),
  ])

  if (!parent) {
    notFound()
  }

  const accessStatus = await getAccessStatus("PARENT", parent)
  // Nome Cognome: nel titolo di una scheda si sta guardando una persona,
  // non la si sta cercando in un elenco ordinato per cognome
  const nome = fullName(parent)
  const athleteCount = parent.athleteRelations.length

  return (
    <>
      <ResourceHeader
        breadcrumbs={[
          { label: "Genitori", href: "/admin/parents" },
          { label: nome },
        ]}
        title={nome}
        action={<ParentDetailHeader parent={parent} />}
      />
      <ResourceContent>
        <AccessStatusCard
          kind="PARENT"
          profileId={parent.id}
          status={accessStatus}
        />

        <div className="grid gap-6 md:grid-cols-2">
          <ParentAnagraficaDisplay parent={parent} />

          <Card>
            <CardHeader>
              <CardTitle>Allieve collegate</CardTitle>
              <CardDescription>
                {athleteCount === 0
                  ? "Nessuna allieva collegata"
                  : athleteCount === 1
                    ? "1 allieva"
                    : `${athleteCount} allieve`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {athleteCount === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <UserRound className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground">
                    Nessuna allieva risulta collegata a questo genitore.
                    Collegalo dalla scheda di un&apos;allieva.
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {parent.athleteRelations.map((rel) => (
                    // La riga porta alla scheda dell'allieva; «Modifica» sta
                    // fuori dal link e apre il dialog del grado di parentela
                    <li
                      key={rel.id}
                      className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center"
                    >
                      <Link
                        href={`/admin/athletes/${rel.athlete.id}`}
                        className="group flex min-w-0 flex-1 items-start justify-between gap-3 rounded-sm"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium underline-offset-4 group-hover:underline">
                              {rel.athlete.lastName} {rel.athlete.firstName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {RELATIONSHIP_LABELS[rel.relationship]}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-2 text-xs">
                            {rel.isPrimaryContact && (
                              <Badge variant="secondary">
                                Contatto principale
                              </Badge>
                            )}
                            {rel.isPrimaryPayer && (
                              <Badge variant="secondary">Paga i contributi</Badge>
                            )}
                          </div>
                        </div>
                        <Badge
                          variant={ATHLETE_STATUS_VARIANTS[rel.athlete.status]}
                        >
                          {ATHLETE_STATUS_LABELS[rel.athlete.status]}
                        </Badge>
                      </Link>
                      <ParentRelationEditButton
                        relation={{
                          id: rel.id,
                          relationship: rel.relationship,
                          isPrimaryContact: rel.isPrimaryContact,
                          isPrimaryPayer: rel.isPrimaryPayer,
                          isPickupAuthorized: rel.isPickupAuthorized,
                          hasParentalAuthority: rel.hasParentalAuthority,
                          parent: {
                            firstName: parent.firstName,
                            lastName: parent.lastName,
                          },
                        }}
                        otherRelations={rel.athlete.parentRelations}
                        athleteName={`${rel.athlete.firstName} ${rel.athlete.lastName}`}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Riepilogo pagamenti</CardTitle>
            <CardDescription>In arrivo nei prossimi sprint.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              In questa sezione troverai totali pagati, scadenze aperte, saldo
              corrente e azioni rapide per inviare solleciti.
            </p>
          </CardContent>
        </Card>

        <EmailLogTable
          title="Storico email"
          description="Tutte le email inviate a questo genitore, in ordine cronologico."
          logs={emailLog}
        />
      </ResourceContent>
    </>
  )
}
