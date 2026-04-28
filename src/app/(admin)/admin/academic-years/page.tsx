import { ResourceContent } from "../_components/resource-content"
import { ResourceHeader } from "../_components/resource-header"

import { AcademicYearsClient } from "./_components/academic-years-client"
import { listAcademicYears } from "./queries"

export default async function AcademicYearsPage() {
  const years = await listAcademicYears()

  return (
    <>
      <ResourceHeader
        breadcrumbs={[{ label: "Anni accademici" }]}
        title="Anni accademici"
        description="Gestione periodi di iscrizione, quote associative e rollover anno corrente."
      />
      <ResourceContent>
        <AcademicYearsClient years={years} />
      </ResourceContent>
    </>
  )
}
