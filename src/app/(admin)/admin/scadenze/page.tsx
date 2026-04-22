import { ResourceContent } from "../_components/resource-content"
import { ResourceHeader } from "../_components/resource-header"

import {
  getCurrentAcademicYear,
  getScadenze,
  listAcademicYearsForFilter,
  listCoursesForFilter,
  type ScadenzeFilter,
  type ScadenzeSort,
  type ScadenzeStatoFilter,
} from "./queries"
import { ScadenzeFilters } from "./_components/scadenze-filters"
import { ScadenzeSearch } from "./_components/scadenze-search"
import { ScadenzeTable } from "./_components/scadenze-table"

interface PageProps {
  searchParams: Promise<{
    stato?: string
    courseId?: string
    academicYearId?: string
    search?: string
    sortBy?: string
  }>
}

function parseStato(value: string | undefined): ScadenzeStatoFilter {
  if (
    value === "IN_RITARDO" ||
    value === "IN_SCADENZA_7GG" ||
    value === "TUTTE"
  ) {
    return value
  }
  return "DEFAULT"
}

function parseSort(value: string | undefined): ScadenzeSort {
  if (value === "dueDate_desc" || value === "amount_desc") return value
  return "dueDate_asc"
}

export default async function ScadenzePage({ searchParams }: PageProps) {
  const resolved = await searchParams
  const stato = parseStato(resolved.stato)
  const sortBy = parseSort(resolved.sortBy)
  const courseId = resolved.courseId?.trim() || undefined
  const search = resolved.search?.trim() || undefined

  const [courses, academicYears, currentAY] = await Promise.all([
    listCoursesForFilter(),
    listAcademicYearsForFilter(),
    getCurrentAcademicYear(),
  ])

  const requestedAyId = resolved.academicYearId?.trim() || undefined
  const academicYearId = requestedAyId ?? currentAY?.id

  const filter: ScadenzeFilter = {
    stato,
    courseId,
    academicYearId,
    search,
    sortBy,
  }

  const scadenze = await getScadenze(filter)

  return (
    <>
      <ResourceHeader
        breadcrumbs={[{ label: "Scadenze" }]}
        title="Scadenze"
        description="Quote aperte: in ritardo, in scadenza nei prossimi 7 giorni, o tutte."
      />
      <ResourceContent>
        <div className="flex flex-col gap-4">
          <ScadenzeFilters
            stato={stato}
            courseId={courseId}
            academicYearId={academicYearId}
            sortBy={sortBy}
            courses={courses}
            academicYears={academicYears}
          />
          <ScadenzeSearch defaultValue={search ?? ""} />
          <ScadenzeTable scadenze={scadenze} />
        </div>
      </ResourceContent>
    </>
  )
}
