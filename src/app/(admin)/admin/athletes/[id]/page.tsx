import { notFound } from "next/navigation"

import { ResourceContent } from "../../_components/resource-content"
import { ResourceHeader } from "../../_components/resource-header"
import { AthleteAnagraficaDisplay } from "../_components/athlete-anagrafica-display"
import { AthleteDetailHeader } from "../_components/athlete-detail-header"
import { GuardianListSection } from "../_components/guardian-list-section"
import { getAthleteById } from "../queries"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AthleteDetailPage({ params }: PageProps) {
  const resolvedParams = await params
  const athlete = await getAthleteById(resolvedParams.id)

  if (!athlete) {
    notFound()
  }

  const fullName = `${athlete.lastName} ${athlete.firstName}`

  return (
    <>
      <ResourceHeader
        breadcrumbs={[
          { label: "Allieve", href: "/admin/athletes" },
          { label: fullName },
        ]}
        title={fullName}
        action={<AthleteDetailHeader athlete={athlete} />}
      />
      <ResourceContent>
        <div className="flex flex-col gap-6">
          <AthleteAnagraficaDisplay athlete={athlete} />
          <GuardianListSection
            athleteId={athlete.id}
            parentRelations={athlete.parentRelations}
          />
        </div>
      </ResourceContent>
    </>
  )
}
