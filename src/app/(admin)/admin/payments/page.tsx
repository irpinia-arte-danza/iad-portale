import { FeeType, PaymentStatus } from "@prisma/client"

import { ResourceContent } from "../_components/resource-content"
import { ResourceHeader } from "../_components/resource-header"

import { listAthletesWithRelations, listPayments } from "./queries"
import { PaymentCreateDialog } from "./_components/payment-create-dialog"
import { PaymentsFilters } from "./_components/payments-filters"
import { PaymentsSearch } from "./_components/payments-search"
import { PaymentsTable } from "./_components/payments-table"

interface PageProps {
  searchParams: Promise<{
    search?: string
    feeType?: string
    status?: string
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

  const [{ items, totalCount }, athletes] = await Promise.all([
    listPayments({ search, feeType, status }),
    listAthletesWithRelations(),
  ])

  return (
    <>
      <ResourceHeader
        breadcrumbs={[{ label: "Pagamenti" }]}
        title="Pagamenti"
        description="Registro entrate: quote mensili, stage, saggio e altri pagamenti."
        action={<PaymentCreateDialog athletes={athletes} />}
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
          <p className="text-xs text-muted-foreground">
            {totalCount}{" "}
            {totalCount === 1 ? "pagamento" : "pagamenti"} totali
          </p>
        </div>
      </ResourceContent>
    </>
  )
}
