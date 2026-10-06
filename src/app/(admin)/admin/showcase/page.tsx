import { redirect } from "next/navigation"
import { Sparkles } from "lucide-react"

import { EmptyState } from "@/components/empty-state"

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
        title={`Saggio ${academicYear.label}`}
      />
      <ResourceContent>
        <EmptyState
          icon={Sparkles}
          title={`Il saggio ${academicYear.label} non è ancora configurato`}
          description="Date, caparra e saldo si impostano qui"
          action={<ShowcaseCreateDialog academicYearId={academicYear.id} />}
        />
      </ResourceContent>
    </>
  )
}
