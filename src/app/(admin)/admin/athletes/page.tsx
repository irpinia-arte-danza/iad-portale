import { redirect } from "next/navigation"

import {
  ListPagination,
  pageHref,
  parsePageParam,
} from "../_components/list-pagination"
import { ResourceContent } from "../_components/resource-content"
import { ResourceHeader } from "../_components/resource-header"

import { GUARDIAN_GAP_FILTER } from "@/lib/athletes/guardian-gap"

import {
  countAthleteSteps,
  listAthletes,
  parseAthleteListFilter,
  type AthleteListFilter,
  type AthleteListSort,
} from "./queries"
import { AthleteCreateDialog } from "./_components/athlete-create-dialog"
import { AthletesFilterChip } from "./_components/athletes-filter-chip"
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
}
// Una pagina contiene le iscritte di un anno (~64, obiettivo 100): oltre
// scatta la paginazione, nessuna allieva resta nascosta.
const PAGE_SIZE = 100
// ?sort=certificato: prima chi non ha il certificato, poi per scadenza
const CERTIFICATE_SORT_PARAM = "certificato"
// ?sort=tessera: stessa regola per la tessera dell'ente
const CARD_SORT_PARAM = "tessera"

interface PageProps {
  searchParams: Promise<{
    search?: string
    page?: string
    sort?: string
    filtro?: string
  }>
}

function listParams(
  search: string,
  sort: AthleteListSort,
  filter: AthleteListFilter | null,
): Record<string, string> {
  const params: Record<string, string> = {}
  if (search) params.search = search
  if (sort === "certificate") params.sort = CERTIFICATE_SORT_PARAM
  if (sort === "card") params.sort = CARD_SORT_PARAM
  if (filter) params.filtro = filter
  return params
}

export default async function AthletesPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams
  const search = resolvedSearchParams.search ?? ""
  const sort: AthleteListSort =
    resolvedSearchParams.sort === CERTIFICATE_SORT_PARAM
      ? "certificate"
      : resolvedSearchParams.sort === CARD_SORT_PARAM
        ? "card"
        : "name"
  const filter: AthleteListFilter | null = parseAthleteListFilter(
    resolvedSearchParams.filtro,
  )
  const page = parsePageParam(resolvedSearchParams.page)
  const params = listParams(search, sort, filter)

  const [{ items, totalCount }, stepCounts] = await Promise.all([
    listAthletes({
      search,
      sort,
      filter: filter ?? undefined,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    countAthleteSteps(),
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <AthletesSearch defaultValue={search} />
            <AthletesFilterChip
              activeFilter={filter}
              withoutGuardianCount={stepCounts.guardian}
              guardianHref={pageHref(
                ATHLETES_PATH,
                listParams(search, sort, GUARDIAN_GAP_FILTER),
                1,
              )}
              offHref={pageHref(
                ATHLETES_PATH,
                listParams(search, sort, null),
                1,
              )}
            />
          </div>
          <AthletesTable
            athletes={items}
            empty={filter ? EMPTY_BY_FILTER[filter] : undefined}
            sort={sort}
            sortHrefs={{
              name: pageHref(
                ATHLETES_PATH,
                listParams(search, "name", filter),
                1,
              ),
              certificate: pageHref(
                ATHLETES_PATH,
                listParams(search, "certificate", filter),
                1,
              ),
              card: pageHref(
                ATHLETES_PATH,
                listParams(search, "card", filter),
                1,
              ),
            }}
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
