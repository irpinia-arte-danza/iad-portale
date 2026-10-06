import { todayInRome } from "@/lib/receipts/numbering"
import { getDailyEmailQuota } from "@/lib/resend/daily-quota"
import { formatEur } from "@/lib/utils/format"

import { ResourceContent } from "../_components/resource-content"
import { ResourceHeader } from "../_components/resource-header"

import {
  listReceiptYears,
  listReceipts,
  parseReceiptDeliveryFilter,
} from "./queries"
import { ReceiptsFilters } from "./_components/receipts-filters"
import { ReceiptsList } from "./_components/receipts-list"

interface PageProps {
  searchParams: Promise<{
    year?: string
    stato?: string
    search?: string
  }>
}

function parseYear(value: string | undefined, fallback: number): number {
  const year = Number.parseInt(value ?? "", 10)
  return Number.isInteger(year) && year >= 2020 && year <= 2100 ? year : fallback
}

export default async function ReceiptsPage({ searchParams }: PageProps) {
  const resolved = await searchParams
  const year = parseYear(resolved.year, todayInRome().getUTCFullYear())
  const stato = parseReceiptDeliveryFilter(resolved.stato)
  const search = resolved.search ?? ""

  const [{ items, counts, summary }, years, quota] = await Promise.all([
    listReceipts({ year, stato, search }),
    listReceiptYears(),
    getDailyEmailQuota(),
  ])

  return (
    <>
      <ResourceHeader
        breadcrumbs={[{ label: "Ricevute" }]}
        title="Ricevute"
        description="Registro delle ricevute emesse, in ordine di numero. Le ricevute annullate restano nell'elenco con il loro numero."
      />
      <ResourceContent>
        <div className="flex flex-col gap-4">
          <ReceiptsFilters
            years={years.includes(year) ? years : [year, ...years]}
            year={year}
            stato={stato}
            counts={counts}
          />

          <p className="text-sm text-muted-foreground">
            {year}: <strong className="text-foreground">{summary.validCount}</strong>{" "}
            {summary.validCount === 1 ? "ricevuta valida" : "ricevute valide"} per{" "}
            <strong className="font-mono text-foreground">
              {formatEur(summary.validAmountCents)}
            </strong>
            {summary.cancelledCount > 0
              ? ` · ${summary.cancelledCount} ${summary.cancelledCount === 1 ? "annullata" : "annullate"}`
              : ""}
            {summary.toDeliverCount > 0
              ? ` · ${summary.toDeliverCount} da consegnare`
              : ""}
          </p>

          <ReceiptsList items={items} quota={quota} />
        </div>
      </ResourceContent>
    </>
  )
}
