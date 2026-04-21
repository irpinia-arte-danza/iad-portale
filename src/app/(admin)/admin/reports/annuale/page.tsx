import { ResourceContent } from "../../_components/resource-content"
import { ResourceHeader } from "../../_components/resource-header"

import {
  AnnualExportForm,
  type AnnualExportYearOption,
} from "./_components/annual-export-form"
import { getAvailableYears } from "./queries"

export default async function AnnualExportPage() {
  const years = await getAvailableYears()

  const options: AnnualExportYearOption[] = years.map((y) => ({
    year: y.year,
    isCurrent: y.isCurrent,
    isClosed: y.isClosed,
    hasData: y.hasData,
  }))

  return (
    <>
      <ResourceHeader
        breadcrumbs={[{ label: "Export annuale" }]}
        title="Export annuale commercialista"
        description="Archivio ZIP con corrispettivi, spese e bilancio di un anno fiscale."
      />
      <ResourceContent>
        <div className="flex flex-col gap-6">
          <AnnualExportForm years={options} />
        </div>
      </ResourceContent>
    </>
  )
}
