import { redirect } from "next/navigation"

import {
  ListPagination,
  pageHref,
  parsePageParam,
} from "../_components/list-pagination"
import { ResourceContent } from "../_components/resource-content"
import { ResourceHeader } from "../_components/resource-header"

import { listAthletes } from "./queries"
import { AthleteCreateDialog } from "./_components/athlete-create-dialog"
import { AthletesSearch } from "./_components/athletes-search"
import { AthletesTable } from "./_components/athletes-table"

const ATHLETES_PATH = "/admin/athletes"
// Una pagina contiene le iscritte di un anno (~64, obiettivo 100): oltre
// scatta la paginazione, nessuna allieva resta nascosta.
const PAGE_SIZE = 100

interface PageProps {
  searchParams: Promise<{ search?: string; page?: string }>
}

export default async function AthletesPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams
  const search = resolvedSearchParams.search ?? ""
  const page = parsePageParam(resolvedSearchParams.page)
  const params: Record<string, string> = search ? { search } : {}

  const { items, totalCount } = await listAthletes({
    search,
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
          <AthletesTable athletes={items} />
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
