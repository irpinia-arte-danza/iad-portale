import { ResourceContent } from "../_components/resource-content"
import { ResourceHeader } from "../_components/resource-header"

import {
  getCourseStatusCounts,
  listActiveTeachers,
  listCourses,
  type CourseStatusFilter,
} from "./queries"
import { CourseCreateDialog } from "./_components/course-create-dialog"
import { CoursesSearch } from "./_components/courses-search"
import { CoursesStatusTabs } from "./_components/courses-status-tabs"
import { CoursesTable } from "./_components/courses-table"

interface PageProps {
  searchParams: Promise<{ search?: string; status?: string }>
}

function parseStatus(value: string | undefined): CourseStatusFilter {
  if (value === "archived" || value === "all") return value
  return "active"
}

export default async function CoursesPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams
  const search = resolvedSearchParams.search ?? ""
  const status = parseStatus(resolvedSearchParams.status)

  const [{ items, totalCount }, teachers, counts] = await Promise.all([
    listCourses({ search, status }),
    listActiveTeachers(),
    getCourseStatusCounts(),
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
          <CoursesStatusTabs current={status} counts={counts} />
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
