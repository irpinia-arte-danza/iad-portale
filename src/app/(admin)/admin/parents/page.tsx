import { ResourceContent } from "../_components/resource-content"
import { ResourceHeader } from "../_components/resource-header"

import { listParents } from "./queries"
import { ParentCreateDialog } from "./_components/parent-create-dialog"
import { ParentsSearch } from "./_components/parents-search"
import { ParentsTable } from "./_components/parents-table"

interface PageProps {
  searchParams: Promise<{ search?: string }>
}

export default async function ParentsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams
  const search = resolvedSearchParams.search ?? ""

  const { items, totalCount } = await listParents({ search })

  return (
    <>
      <ResourceHeader
        breadcrumbs={[{ label: "Genitori" }]}
        title="Genitori"
        description="Anagrafica soci genitori/tutori delle allieve."
        action={<ParentCreateDialog />}
      />
      <ResourceContent>
        <div className="flex flex-col gap-4">
          <ParentsSearch defaultValue={search} />
          <ParentsTable parents={items} />
          <p className="text-xs text-muted-foreground">
            {totalCount} {totalCount === 1 ? "genitore" : "genitori"} totali
          </p>
        </div>
      </ResourceContent>
    </>
  )
}
