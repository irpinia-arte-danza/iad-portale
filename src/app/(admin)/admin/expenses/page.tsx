import { ExpenseType, PaymentMethod } from "@prisma/client"

import { ResourceContent } from "../_components/resource-content"
import { ResourceHeader } from "../_components/resource-header"

import { listExpenses } from "./queries"
import { ExpenseCreateDialog } from "./_components/expense-create-dialog"
import { ExpensesFilters } from "./_components/expenses-filters"
import { ExpensesSearch } from "./_components/expenses-search"
import { ExpensesTable } from "./_components/expenses-table"

interface PageProps {
  searchParams: Promise<{
    search?: string
    type?: string
    method?: string
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

  const { items, totalCount } = await listExpenses({ search, type, method })

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
          <p className="text-xs text-muted-foreground">
            {totalCount} {totalCount === 1 ? "spesa totale" : "spese totali"}
          </p>
        </div>
      </ResourceContent>
    </>
  )
}
