import { ScheduleSettleProvider } from "@/app/(admin)/admin/athletes/_components/schedule-settle-provider"

import { ResourceContent } from "../_components/resource-content"
import { ResourceHeader } from "../_components/resource-header"
import {
  listAthletesWithRelations,
  listOpenSchedulesByAthlete,
} from "../payments/queries"

import {
  getCurrentAcademicYear,
  getScadenze,
  getScadenzeCounts,
  listAcademicYearsForFilter,
  listCoursesForFilter,
  type ScadenzeFilter,
  type ScadenzeSort,
  type ScadenzeStatoFilter,
} from "./queries"
import { ScadenzeFilters } from "./_components/scadenze-filters"
import { ScadenzeList } from "./_components/scadenze-list"
import { ScadenzeSearch } from "./_components/scadenze-search"

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

  // I dati del form di incasso: lo stesso dialog della scheda allieva si
  // apre qui, con la rata già spuntata
  const [scadenze, counts, athletesForPaymentForm, openSchedulesByAthlete] =
    await Promise.all([
      getScadenze(filter),
      getScadenzeCounts({ courseId, academicYearId, search, sortBy }),
      listAthletesWithRelations(),
      listOpenSchedulesByAthlete(),
    ])

  return (
    <>
      <ResourceHeader
        breadcrumbs={[{ label: "Scadenze" }]}
        title="Scadenze"
        description="Contributi aperti: in ritardo, in scadenza nei prossimi 7 giorni, o tutti."
      />
      <ResourceContent>
        <ScheduleSettleProvider
          athletesForPaymentForm={athletesForPaymentForm}
          openSchedulesByAthlete={openSchedulesByAthlete}
        >
          <div className="flex flex-col gap-4">
            <ScadenzeFilters
              stato={stato}
              courseId={courseId}
              academicYearId={academicYearId}
              sortBy={sortBy}
              courses={courses}
              academicYears={academicYears}
              counts={counts}
            />
            <ScadenzeSearch defaultValue={search ?? ""} />
            <ScadenzeList scadenze={scadenze} />
          </div>
        </ScheduleSettleProvider>
      </ResourceContent>
    </>
  )
}
