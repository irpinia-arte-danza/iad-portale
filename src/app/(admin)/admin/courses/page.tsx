import { prisma } from "@/lib/prisma"

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

  const [{ items, totalCount }, teachers, counts, currentAcademicYear] =
    await Promise.all([
      listCourses({ search, status }),
      listActiveTeachers(),
      getCourseStatusCounts(),
      prisma.academicYear.findFirst({
        where: { isCurrent: true },
        select: { label: true },
      }),
    ])

  return (
    <>
      <ResourceHeader
        breadcrumbs={[{ label: "Corsi" }]}
        title="Corsi"
        description="Catalogo corsi, fasce d'età e contributi mensili."
        action={
          <CourseCreateDialog
            teachers={teachers}
            currentAcademicYearLabel={currentAcademicYear?.label ?? null}
          />
        }
      />
      <ResourceContent>
        <div className="flex flex-col gap-4">
          {/* L'anno accademico sta già nell'intestazione di ogni pagina: qui
              sotto era lo stesso chip una seconda volta */}
          <CoursesStatusTabs current={status} counts={counts} />
          <CoursesSearch defaultValue={search} />
          <CoursesTable courses={items} teachers={teachers} />
          {totalCount > 0 ? (
            <p className="text-xs text-muted-foreground">
              {totalCount} {totalCount === 1 ? "corso" : "corsi"} totali
            </p>
          ) : null}
        </div>
      </ResourceContent>
    </>
  )
}
