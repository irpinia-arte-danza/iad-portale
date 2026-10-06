import { YearNotice } from "@/components/year-notice"
import { YearSelector } from "@/components/year-selector"
import { todayInRome } from "@/lib/receipts/numbering"
import { getDailyEmailQuota } from "@/lib/resend/daily-quota"
import { formatEuro } from "@/lib/utils/format"

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
  const currentYear = todayInRome().getUTCFullYear()
  const year = parseYear(resolved.year, currentYear)
  const stato = parseReceiptDeliveryFilter(resolved.stato)
  const search = resolved.search ?? ""

  const [{ items, counts, summary }, years, quota] = await Promise.all([
    listReceipts({ year, stato, search }),
    listReceiptYears(),
    getDailyEmailQuota(),
  ])

  // L'indirizzo dell'anno corrente: lo stesso, senza ?year
  const backParams = new URLSearchParams()
  if (resolved.stato) backParams.set("stato", resolved.stato)
  if (search) backParams.set("search", search)
  const backQuery = backParams.toString()
  const yearOptions = (years.includes(year) ? years : [year, ...years]).map(
    (y) => ({ value: String(y), label: String(y) }),
  )

  return (
    <>
      <ResourceHeader
        breadcrumbs={[{ label: "Ricevute" }]}
        title="Ricevute"
        description="Registro delle ricevute emesse, in ordine di numero. Le ricevute annullate restano nell'elenco con il loro numero."
        titleAddon={
          <YearSelector
            kind="fiscal"
            value={String(year)}
            options={yearOptions}
            apply={{ mode: "param", name: "year" }}
            currentValue={String(currentYear)}
          />
        }
        notice={
          <YearNotice
            selected={String(year)}
            current={String(currentYear)}
            backHref={
              backQuery ? `/admin/receipts?${backQuery}` : "/admin/receipts"
            }
          />
        }
      />
      <ResourceContent>
        <div className="flex flex-col gap-4">
          <ReceiptsFilters
            stato={stato}
            counts={counts}
          />

          <p className="text-sm text-muted-foreground">
            {year}: <strong className="text-foreground">{summary.validCount}</strong>{" "}
            {summary.validCount === 1 ? "ricevuta valida" : "ricevute valide"} per{" "}
            <strong className="font-mono text-foreground">
              {formatEuro(summary.validAmountCents)}
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
