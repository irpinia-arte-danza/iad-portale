import { ResourceContent } from "../_components/resource-content"
import { ResourceHeader } from "../_components/resource-header"

import { listTeachers } from "./queries"
import { TeacherCreateDialog } from "./_components/teacher-create-dialog"
import { TeachersSearch } from "./_components/teachers-search"
import { TeachersTable } from "./_components/teachers-table"

interface PageProps {
  searchParams: Promise<{ search?: string }>
}

export default async function TeachersPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams
  const search = resolvedSearchParams.search ?? ""

  const { items, totalCount } = await listTeachers({ search })

  return (
    <>
      <ResourceHeader
        breadcrumbs={[{ label: "Insegnanti" }]}
        title="Insegnanti"
        description="Anagrafica insegnanti e collaboratori sportivi."
        action={<TeacherCreateDialog />}
      />
      <ResourceContent>
        <div className="flex flex-col gap-4">
          <TeachersSearch defaultValue={search} />
          <TeachersTable teachers={items} />
          <p className="text-xs text-muted-foreground">
            {totalCount} {totalCount === 1 ? "insegnante" : "insegnanti"} totali
          </p>
        </div>
      </ResourceContent>
    </>
  )
}
