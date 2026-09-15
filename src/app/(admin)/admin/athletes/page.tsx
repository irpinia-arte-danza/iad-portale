import { redirect } from "next/navigation"

import {
  ListPagination,
  pageHref,
  parsePageParam,
} from "../_components/list-pagination"
import { ResourceContent } from "../_components/resource-content"
import { ResourceHeader } from "../_components/resource-header"

import { listAthletes, type AthleteListSort } from "./queries"
import { AthleteCreateDialog } from "./_components/athlete-create-dialog"
import { AthletesSearch } from "./_components/athletes-search"
import { AthletesTable } from "./_components/athletes-table"

const ATHLETES_PATH = "/admin/athletes"
// Una pagina contiene le iscritte di un anno (~64, obiettivo 100): oltre
// scatta la paginazione, nessuna allieva resta nascosta.
const PAGE_SIZE = 100
// ?sort=certificato: prima chi non ha il certificato, poi per scadenza
const CERTIFICATE_SORT_PARAM = "certificato"

interface PageProps {
  searchParams: Promise<{ search?: string; page?: string; sort?: string }>
}

function listParams(
  search: string,
  sort: AthleteListSort,
): Record<string, string> {
  const params: Record<string, string> = {}
  if (search) params.search = search
  if (sort === "certificate") params.sort = CERTIFICATE_SORT_PARAM
  return params
}

export default async function AthletesPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams
  const search = resolvedSearchParams.search ?? ""
  const sort: AthleteListSort =
    resolvedSearchParams.sort === CERTIFICATE_SORT_PARAM
      ? "certificate"
      : "name"
  const page = parsePageParam(resolvedSearchParams.page)
  const params = listParams(search, sort)

  const { items, totalCount } = await listAthletes({
    search,
    sort,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  })

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
          <AthletesTable
            athletes={items}
            sort={sort}
            sortHrefs={{
              name: pageHref(ATHLETES_PATH, listParams(search, "name"), 1),
              certificate: pageHref(
                ATHLETES_PATH,
                listParams(search, "certificate"),
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
