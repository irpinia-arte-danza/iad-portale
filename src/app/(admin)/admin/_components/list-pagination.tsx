import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"

// Paginazione via query string (?page=N) per le liste admin: nessun record
// resta nascosto oltre il limite della pagina.

export function parsePageParam(value: string | undefined): number {
  const page = Number(value)
  return Number.isInteger(page) && page >= 1 ? page : 1
}

export function pageHref(
  basePath: string,
  params: Record<string, string>,
  page: number,
): string {
  const query = new URLSearchParams(params)
  if (page > 1) query.set("page", String(page))
  else query.delete("page")
  const qs = query.toString()
  return qs ? `${basePath}?${qs}` : basePath
}

type Props = {
  basePath: string
  // Parametri da conservare nei link (es. ricerca), senza `page`
  params: Record<string, string>
  page: number
  pageSize: number
  totalCount: number
  noun: { singular: string; plural: string }
}

export function ListPagination({
  basePath,
  params,
  page,
  pageSize,
  totalCount,
  noun,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const label = totalCount === 1 ? noun.singular : noun.plural

  if (totalPages === 1) {
    return (
      <p className="text-xs text-muted-foreground">
        {totalCount} {label} {totalCount === 1 ? "totale" : "totali"}
      </p>
    )
  }

  const first = (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, totalCount)

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs text-muted-foreground">
        {first}–{last} di {totalCount} {label}
      </p>
      <nav aria-label="Pagine" className="flex items-center gap-2">
        {page > 1 ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={pageHref(basePath, params, page - 1)}>
              <ChevronLeft className="h-4 w-4" />
              Precedente
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            <ChevronLeft className="h-4 w-4" />
            Precedente
          </Button>
        )}
        <span className="text-xs text-muted-foreground">
          Pagina {page} di {totalPages}
        </span>
        {page < totalPages ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={pageHref(basePath, params, page + 1)}>
              Successiva
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Successiva
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </nav>
    </div>
  )
}
