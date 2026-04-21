import { ResourceContent } from "../_components/resource-content"
import { ResourceHeader } from "../_components/resource-header"

import { listActiveTeachers, listCourses } from "./queries"
import { CourseCreateDialog } from "./_components/course-create-dialog"
import { CoursesSearch } from "./_components/courses-search"
import { CoursesTable } from "./_components/courses-table"

interface PageProps {
  searchParams: Promise<{ search?: string }>
}

export default async function CoursesPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams
  const search = resolvedSearchParams.search ?? ""

  const [{ items, totalCount }, teachers] = await Promise.all([
    listCourses({ search }),
    listActiveTeachers(),
  ])

  return (
    <>
      <ResourceHeader
        breadcrumbs={[{ label: "Corsi" }]}
        title="Corsi"
        description="Catalogo corsi, fasce d'età e quote mensili."
        action={<CourseCreateDialog teachers={teachers} />}
      />
      <ResourceContent>
        <div className="flex flex-col gap-4">
          <CoursesSearch defaultValue={search} />
          <CoursesTable courses={items} teachers={teachers} />
          <p className="text-xs text-muted-foreground">
            {totalCount} {totalCount === 1 ? "corso" : "corsi"} totali
          </p>
        </div>
      </ResourceContent>
    </>
  )
}
