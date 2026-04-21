import { ResourceContent } from "../_components/resource-content"
import { ResourceHeader } from "../_components/resource-header"

import { listAthletes } from "./queries"
import { AthleteCreateDialog } from "./_components/athlete-create-dialog"
import { AthletesSearch } from "./_components/athletes-search"
import { AthletesTable } from "./_components/athletes-table"

interface PageProps {
  searchParams: Promise<{ search?: string }>
}

export default async function AthletesPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams
  const search = resolvedSearchParams.search ?? ""

  const { items, totalCount } = await listAthletes({ search })

  return (
    <>
      <ResourceHeader
        breadcrumbs={[{ label: "Allieve" }]}
        title="Allieve"
        description="Anagrafica delle allieve iscritte all'IAD."
        action={<AthleteCreateDialog />}
      />
      <ResourceContent>
        <div className="flex flex-col gap-4">
          <AthletesSearch defaultValue={search} />
          <AthletesTable athletes={items} />
          <p className="text-xs text-muted-foreground">
            {totalCount} {totalCount === 1 ? "allieva" : "allieve"} totali
          </p>
        </div>
      </ResourceContent>
    </>
  )
}
