import Link from "next/link"
import { redirect } from "next/navigation"
import { ReceiptText, X } from "lucide-react"
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
    // ?ricevuta=mancante — ci arriva il riquadro "Pagamenti senza ricevuta"
    ricevuta?: string
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
  const missingReceipt = resolved.ricevuta === "mancante"
  const page = parsePageParam(resolved.page)

  // Parametri da conservare nei link di pagina
  const params: Record<string, string> = {}
  if (search) params.search = search
  if (feeType) params.feeType = feeType
  if (status) params.status = status
  if (missingReceipt) params.ricevuta = "mancante"

  const [{ items, totalCount }, athletes, openSchedulesByAthlete] =
    await Promise.all([
      listPayments({
        search,
        feeType,
        status,
        missingReceipt,
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
        description="Registro entrate: contributi mensili, stage, saggio e altri pagamenti."
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
            {/* Filtro che arriva dalla dashboard: va detto che è attivo e
                come toglierlo, altrimenti l'elenco sembra incompleto */}
            {missingReceipt ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-900 dark:text-amber-200">
                  <ReceiptText className="h-3.5 w-3.5" />
                  Senza ricevuta
                </span>
                <Link
                  href={PAYMENTS_PATH}
                  className="inline-flex min-h-11 items-center gap-1 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                  Togli il filtro
                </Link>
              </div>
            ) : null}
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
