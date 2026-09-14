import { redirect } from "next/navigation"
import { ExpenseType, PaymentMethod } from "@prisma/client"

import {
  ListPagination,
  pageHref,
  parsePageParam,
} from "../_components/list-pagination"
import { ResourceContent } from "../_components/resource-content"
import { ResourceHeader } from "../_components/resource-header"

import { listExpenses } from "./queries"
import { ExpenseCreateDialog } from "./_components/expense-create-dialog"
import { ExpensesFilters } from "./_components/expenses-filters"
import { ExpensesSearch } from "./_components/expenses-search"
import { ExpensesTable } from "./_components/expenses-table"

const EXPENSES_PATH = "/admin/expenses"
const PAGE_SIZE = 50

interface PageProps {
  searchParams: Promise<{
    search?: string
    type?: string
    method?: string
    page?: string
  }>
}

function parseExpenseType(value: string | undefined): ExpenseType | undefined {
  if (!value) return undefined
  const allowed: ExpenseType[] = [
    "RENT",
    "TAX_F24",
    "UTILITY",
    "COMPENSATION",
    "COSTUME_PURCHASE",
    "MATERIAL",
    "INSURANCE",
    "AFFILIATION",
    "OTHER",
  ]
  return allowed.includes(value as ExpenseType)
    ? (value as ExpenseType)
    : undefined
}

function parseMethod(value: string | undefined): PaymentMethod | undefined {
  if (!value) return undefined
  const allowed: PaymentMethod[] = [
    "CASH",
    "TRANSFER",
    "POS",
    "SUMUP_LINK",
    "OTHER",
  ]
  return allowed.includes(value as PaymentMethod)
    ? (value as PaymentMethod)
    : undefined
}

export default async function ExpensesPage({ searchParams }: PageProps) {
  const resolved = await searchParams
  const search = resolved.search ?? ""
  const type = parseExpenseType(resolved.type)
  const method = parseMethod(resolved.method)
  const page = parsePageParam(resolved.page)

  // Parametri da conservare nei link di pagina
  const params: Record<string, string> = {}
  if (search) params.search = search
  if (type) params.type = type
  if (method) params.method = method

  const { items, totalCount } = await listExpenses({
    search,
    type,
    method,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  })

  // Pagina oltre la fine (link vecchio, spese eliminate): all'ultima
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  if (page > totalPages) {
    redirect(pageHref(EXPENSES_PATH, params, totalPages))
  }

  return (
    <>
      <ResourceHeader
        breadcrumbs={[{ label: "Spese" }]}
        title="Spese"
        description="Uscite associazione: affitti, F24, compensi, costumi, utenze."
        action={<ExpenseCreateDialog />}
      />
      <ResourceContent>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <ExpensesSearch defaultValue={search} />
            <ExpensesFilters defaultType={type} defaultMethod={method} />
          </div>
          <ExpensesTable expenses={items} />
          <ListPagination
            basePath={EXPENSES_PATH}
            params={params}
            page={page}
            pageSize={PAGE_SIZE}
            totalCount={totalCount}
            noun={{ singular: "spesa", plural: "spese" }}
          />
        </div>
      </ResourceContent>
    </>
  )
}
