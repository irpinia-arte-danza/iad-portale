import { redirect } from "next/navigation"

import {
  ListPagination,
  pageHref,
  parsePageParam,
} from "../_components/list-pagination"
import { ResourceContent } from "../_components/resource-content"
import { ResourceHeader } from "../_components/resource-header"
import { listCoursesForFilter } from "../scadenze/queries"

import { GUARDIAN_GAP_FILTER } from "@/lib/athletes/guardian-gap"
import {
  OVERDUE_FILTER,
  athleteSortParam,
  parseAthleteListFilter,
  parseAthleteListSort,
  parseAthleteStatusFilter,
  type AthleteListFilter,
  type AthleteListSort,
  type AthleteStatusFilter,
} from "@/lib/athletes/list-filters"

import { listAthletes } from "./queries"
import { AthleteCreateDialog } from "./_components/athlete-create-dialog"
import { AthletesFilters } from "./_components/athletes-filters"
import { AthletesSearch } from "./_components/athletes-search"
import { AthletesTable } from "./_components/athletes-table"

const ATHLETES_PATH = "/admin/athletes"

// Con un filtro attivo "nessun risultato" è una buona notizia, e dirlo è
// diverso dal suggerire di aggiungere la prima allieva
const EMPTY_BY_FILTER: Record<
  AthleteListFilter,
  { title: string; hint: string }
> = {
  [GUARDIAN_GAP_FILTER]: {
    title: "Nessuna minorenne senza genitore collegato",
    hint: "Tutte le allieve minorenni hanno almeno un genitore o tutore collegato.",
  },
  "senza-corso": {
    title: "Nessuna allieva senza corso",
    hint: "Tutte le allieve attive hanno un'iscrizione per l'anno corrente.",
  },
  "senza-email": {
    title: "Nessuna maggiorenne senza email",
    hint: "Le allieve maggiorenni senza genitori collegati hanno tutte un'email.",
  },
  "senza-certificato": {
    title: "Nessuna allieva senza certificato valido",
    hint: "Tutte hanno un certificato medico in corso di validità.",
  },
  "senza-privacy": {
    title: "Nessuna allieva senza consenso privacy",
    hint: "Per tutte risulta registrata la firma dell'informativa privacy.",
  },
  [OVERDUE_FILTER]: {
    title: "Nessun contributo in ritardo",
    hint: "Tutte le rate scadute risultano incassate.",
  },
}

// Una pagina contiene le iscritte di un anno (~64, obiettivo 100): oltre
// scatta la paginazione, nessuna allieva resta nascosta.
const PAGE_SIZE = 100

interface PageProps {
  searchParams: Promise<{
    search?: string
    page?: string
    sort?: string
    filtro?: string
    corso?: string
    stato?: string
  }>
}

// Tutti i filtri stanno nell'URL: la paginazione e i link se li portano
// dietro, e l'indirizzo filtrato si può mandare a qualcuno
function listParams(input: {
  search: string
  sort: AthleteListSort
  filter: AthleteListFilter | null
  courseId?: string
  stato: AthleteStatusFilter
}): Record<string, string> {
  const params: Record<string, string> = {}
  if (input.search) params.search = input.search
  const sortParam = athleteSortParam(input.sort)
  if (sortParam) params.sort = sortParam
  if (input.filter) params.filtro = input.filter
  if (input.courseId) params.corso = input.courseId
  if (input.stato !== "attive") params.stato = input.stato
  return params
}

export default async function AthletesPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams
  const search = resolvedSearchParams.search ?? ""
  const sort = parseAthleteListSort(resolvedSearchParams.sort)
  const filter = parseAthleteListFilter(resolvedSearchParams.filtro)
  const stato = parseAthleteStatusFilter(resolvedSearchParams.stato)
  const courseId = resolvedSearchParams.corso?.trim() || undefined
  const page = parsePageParam(resolvedSearchParams.page)
  const params = listParams({ search, sort, filter, courseId, stato })

  const [{ items, totalCount, counts }, courses] = await Promise.all([
    listAthletes({
      search,
      sort,
      filter: filter ?? undefined,
      courseId,
      stato,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    // Gli stessi corsi della select di Scadenze: attivi e non cestinati
    listCoursesForFilter(),
  ])

  // Pagina oltre la fine (link vecchio, allieve eliminate): all'ultima
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  if (page > totalPages) {
    redirect(pageHref(ATHLETES_PATH, params, totalPages))
  }

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
          <AthletesFilters
            filter={filter}
            stato={stato}
            sort={sort}
            courseId={courseId}
            courses={courses}
            counts={counts}
          />
          <AthletesTable
            athletes={items}
            empty={filter ? EMPTY_BY_FILTER[filter] : undefined}
          />
          <ListPagination
            basePath={ATHLETES_PATH}
            params={params}
            page={page}
            pageSize={PAGE_SIZE}
            totalCount={totalCount}
            noun={{ singular: "allieva", plural: "allieve" }}
          />
        </div>
      </ResourceContent>
    </>
  )
}
