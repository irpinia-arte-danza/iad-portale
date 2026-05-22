import { redirect } from "next/navigation"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { ResourceContent } from "../_components/resource-content"
import { ResourceHeader } from "../_components/resource-header"

import { ShowcaseCreateDialog } from "./_components/showcase-create-dialog"
import { getCurrentShowcase } from "./queries"

export const dynamic = "force-dynamic"

export default async function ShowcasePage() {
  const { academicYear, showcase } = await getCurrentShowcase()

  if (!academicYear) {
    return (
      <>
        <ResourceHeader
          breadcrumbs={[{ label: "Saggio" }]}
          title="Saggio annuale"
          description="Configura prima un anno accademico corrente."
        />
        <ResourceContent>
          <Card>
            <CardHeader>
              <CardTitle>Nessun anno accademico corrente</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Vai in <span className="font-medium">Impostazioni → Anni
              accademici</span> e contrassegna l&apos;AA corrente.
            </CardContent>
          </Card>
        </ResourceContent>
      </>
    )
  }

  if (showcase) {
    redirect(`/admin/showcase/${showcase.id}`)
  }

  return (
    <>
      <ResourceHeader
        breadcrumbs={[{ label: "Saggio" }]}
        title={`Saggio AA ${academicYear.label}`}
        description="Un solo saggio per anno accademico. Crea quello dell'AA corrente."
      />
      <ResourceContent>
        <Card>
          <CardHeader>
            <CardTitle>Nessun saggio configurato per l&apos;AA {academicYear.label}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Crea il saggio per definire date, scadenze caparra/saldo e quote.
              Le partecipazioni si gestiscono dalla scheda del saggio.
            </p>
            <ShowcaseCreateDialog academicYearId={academicYear.id} />
          </CardContent>
        </Card>
      </ResourceContent>
    </>
  )
}
