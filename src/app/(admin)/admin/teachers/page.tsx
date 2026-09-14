import { getAccessStatuses } from "@/lib/auth/access-status"

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
  const accessStatuses = await getAccessStatuses("TEACHER", items)

  return (
    <>
      <ResourceHeader
        breadcrumbs={[{ label: "Insegnanti" }]}
        title="Insegnanti"
        description="Anagrafica insegnanti e collaboratori sportivi e accesso all'area insegnanti."
        action={<TeacherCreateDialog />}
      />
      <ResourceContent>
        <div className="flex flex-col gap-4">
          <TeachersSearch defaultValue={search} />
          <TeachersTable teachers={items} accessStatuses={accessStatuses} />
          <p className="text-xs text-muted-foreground">
            {totalCount} {totalCount === 1 ? "insegnante" : "insegnanti"} totali
          </p>
        </div>
      </ResourceContent>
    </>
  )
}
