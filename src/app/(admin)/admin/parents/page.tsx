import { previewAccessInviteEmail } from "@/lib/auth/access-emails"
import { getAccessStatuses } from "@/lib/auth/access-status"
import {
  matchesParentsFilter,
  parentsFilterCounts,
  parseParentsFilter,
} from "@/lib/parents/list-filters"

import { ResourceContent } from "../_components/resource-content"
import { ResourceHeader } from "../_components/resource-header"

import { listParents } from "./queries"
import { ParentCreateDialog } from "./_components/parent-create-dialog"
import { ParentsFilters } from "./_components/parents-filters"
import { ParentsSearch } from "./_components/parents-search"
import { ParentsTable } from "./_components/parents-table"

interface PageProps {
  searchParams: Promise<{ search?: string; filtro?: string }>
}

export default async function ParentsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams
  const search = resolvedSearchParams.search ?? ""
  const filtro = parseParentsFilter(resolvedSearchParams.filtro)

  const { items, totalCount } = await listParents({ search })
  const [accessStatuses, invitePreview] = await Promise.all([
    getAccessStatuses("PARENT", items),
    // Il testo dell'invito, per l'anteprima dell'invio di gruppo: dallo
    // stesso modello dell'invio vero
    previewAccessInviteEmail("PARENT"),
  ])

  // Filtro e conteggi qui e non in SQL: lo stato dell'accesso non è una
  // colonna, si ricava da auth.users e da EmailLog. È la stessa funzione che
  // disegna la colonna "Accesso" e conta il riquadro in dashboard, quindi
  // chip, righe e riquadro non possono dire numeri diversi.
  const counts = parentsFilterCounts(
    items.map((p) => p.id),
    accessStatuses,
  )
  const rows = filtro
    ? items.filter((p) => matchesParentsFilter(accessStatuses[p.id], filtro))
    : items

  return (
    <>
      <ResourceHeader
        breadcrumbs={[{ label: "Genitori" }]}
        title="Genitori"
        description="Anagrafica soci genitori/tutori delle allieve e accesso all'area genitori."
        action={<ParentCreateDialog />}
      />
      <ResourceContent>
        <div className="flex flex-col gap-4">
          <ParentsSearch defaultValue={search} />
          <ParentsFilters filter={filtro} counts={counts} />
          <ParentsTable
            parents={rows}
            accessStatuses={accessStatuses}
            invitePreview={invitePreview}
          />
          {totalCount > items.length ? (
            <p className="text-xs text-muted-foreground">
              Mostrati i primi {items.length} di {totalCount} genitori.
            </p>
          ) : null}
        </div>
      </ResourceContent>
    </>
  )
}
