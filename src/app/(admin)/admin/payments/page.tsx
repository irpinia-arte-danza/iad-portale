import { redirect } from "next/navigation"
import { FeeType, PaymentStatus } from "@prisma/client"

import {
  ListPagination,
  pageHref,
  parsePageParam,
} from "../_components/list-pagination"
import { ResourceContent } from "../_components/resource-content"
import { ResourceHeader } from "../_components/resource-header"

import {
  listAthletesWithRelations,
  listOpenSchedulesByAthlete,
  listPayments,
} from "./queries"
import { PaymentCreateDialog } from "./_components/payment-create-dialog"
import { PaymentsFilters } from "./_components/payments-filters"
import { PaymentsSearch } from "./_components/payments-search"
import { PaymentsTable } from "./_components/payments-table"

const PAYMENTS_PATH = "/admin/payments"
const PAGE_SIZE = 50

interface PageProps {
  searchParams: Promise<{
    search?: string
    feeType?: string
    status?: string
    page?: string
  }>
}

function parseFeeType(value: string | undefined): FeeType | undefined {
  if (!value) return undefined
  const allowed: FeeType[] = [
    "ASSOCIATION",
    "MONTHLY",
    "TRIMESTER",
    "STAGE",
    "SHOWCASE_1",
    "SHOWCASE_2",
    "COSTUME",
    "TRIAL_LESSON",
    "OTHER",
  ]
  return allowed.includes(value as FeeType) ? (value as FeeType) : undefined
}

function parseStatus(value: string | undefined): PaymentStatus | undefined {
  if (!value) return undefined
  if (value === "PAID" || value === "REVERSED") return value
  return undefined
}

export default async function PaymentsPage({ searchParams }: PageProps) {
  const resolved = await searchParams
  const search = resolved.search ?? ""
  const feeType = parseFeeType(resolved.feeType)
  const status = parseStatus(resolved.status)
  const page = parsePageParam(resolved.page)

  // Parametri da conservare nei link di pagina
  const params: Record<string, string> = {}
  if (search) params.search = search
  if (feeType) params.feeType = feeType
  if (status) params.status = status

  const [{ items, totalCount }, athletes, openSchedulesByAthlete] =
    await Promise.all([
      listPayments({
        search,
        feeType,
        status,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      }),
      listAthletesWithRelations(),
      listOpenSchedulesByAthlete(),
    ])

  // Pagina oltre la fine (link vecchio, pagamenti eliminati): all'ultima
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  if (page > totalPages) {
    redirect(pageHref(PAYMENTS_PATH, params, totalPages))
  }

  return (
    <>
      <ResourceHeader
        breadcrumbs={[{ label: "Pagamenti" }]}
        title="Pagamenti"
        description="Registro entrate: quote mensili, stage, saggio e altri pagamenti."
        action={
          <PaymentCreateDialog
            athletes={athletes}
            openSchedulesByAthlete={openSchedulesByAthlete}
          />
        }
      />
      <ResourceContent>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <PaymentsSearch defaultValue={search} />
            <PaymentsFilters
              defaultFeeType={feeType}
              defaultStatus={status}
            />
          </div>
          <PaymentsTable payments={items} />
          <ListPagination
            basePath={PAYMENTS_PATH}
            params={params}
            page={page}
            pageSize={PAGE_SIZE}
            totalCount={totalCount}
            noun={{ singular: "pagamento", plural: "pagamenti" }}
          />
        </div>
      </ResourceContent>
    </>
  )
}
