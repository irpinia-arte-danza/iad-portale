import Link from "next/link"
import { X } from "lucide-react"

import { getAccessStatuses } from "@/lib/auth/access-status"

import { ResourceContent } from "../_components/resource-content"
import { ResourceHeader } from "../_components/resource-header"

import { listParents, parseParentsFilter } from "./queries"
import { ParentCreateDialog } from "./_components/parent-create-dialog"
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
  const accessStatuses = await getAccessStatuses("PARENT", items)

  // Il filtro si applica qui e non in SQL: lo stato dell'accesso non è una
  // colonna, si ricava da auth.users e da EmailLog. È la stessa funzione che
  // conta il riquadro in dashboard.
  const rows = filtro
    ? items.filter((p) => accessStatuses[p.id]?.kind === "NEVER_INVITED")
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
          {filtro ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-status-fix-border bg-status-fix-bg px-3 py-1.5 text-xs font-medium text-status-fix">
                Mai invitati ({rows.length})
              </span>
              <Link
                href="/admin/parents"
                className="inline-flex min-h-11 items-center gap-1 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
                Togli il filtro
              </Link>
            </div>
          ) : null}
          <ParentsTable parents={rows} accessStatuses={accessStatuses} />
          <p className="text-xs text-muted-foreground">
            {filtro
              ? `${rows.length} ${rows.length === 1 ? "genitore" : "genitori"} mai ${rows.length === 1 ? "invitato" : "invitati"} su ${totalCount}`
              : `${totalCount} ${totalCount === 1 ? "genitore" : "genitori"} totali${
                  totalCount > items.length
                    ? ` · mostrati i primi ${items.length}`
                    : ""
                }`}
          </p>
        </div>
      </ResourceContent>
    </>
  )
}
