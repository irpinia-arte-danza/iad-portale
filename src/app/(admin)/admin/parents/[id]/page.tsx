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

import { ResourceContent } from "../../_components/resource-content"
import { ResourceHeader } from "../../_components/resource-header"
import { ParentAnagraficaDisplay } from "../_components/parent-anagrafica-display"
import { ParentDetailHeader } from "../_components/parent-detail-header"
import { getParentById } from "../queries"

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
  const parent = await getParentById(resolvedParams.id)

  if (!parent) {
    notFound()
  }

  const fullName = `${parent.lastName} ${parent.firstName}`
  const athleteCount = parent.athleteRelations.length

  return (
    <>
      <ResourceHeader
        breadcrumbs={[
          { label: "Genitori", href: "/admin/parents" },
          { label: fullName },
        ]}
        title={fullName}
        action={<ParentDetailHeader parent={parent} />}
      />
      <ResourceContent>
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
                    <li key={rel.id}>
                      <Link
                        href={`/admin/athletes/${rel.athlete.id}`}
                        className="flex items-start justify-between gap-3 rounded-md border p-3 hover:bg-muted/50"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">
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
                              <Badge variant="secondary">Paga le quote</Badge>
                            )}
                          </div>
                        </div>
                        <Badge
                          variant={ATHLETE_STATUS_VARIANTS[rel.athlete.status]}
                        >
                          {ATHLETE_STATUS_LABELS[rel.athlete.status]}
                        </Badge>
                      </Link>
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
            <CardDescription>
              Disponibile dopo Sprint 3 (Email + reminder)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              In questa sezione troverai totali pagati, scadenze aperte, saldo
              corrente e azioni rapide per inviare solleciti.
            </p>
          </CardContent>
        </Card>
      </ResourceContent>
    </>
  )
}
