import type { ReceiptStatus } from "@prisma/client"

import { todayInRome } from "@/lib/receipts/numbering"
import { getDailyEmailQuota } from "@/lib/resend/daily-quota"
import { formatEur } from "@/lib/utils/format"

import { ResourceContent } from "../_components/resource-content"
import { ResourceHeader } from "../_components/resource-header"

import { listReceiptYears, listReceipts, type ReceiptSentFilter } from "./queries"
import { ReceiptsFilters } from "./_components/receipts-filters"
import { ReceiptsTable } from "./_components/receipts-table"

interface PageProps {
  searchParams: Promise<{
    year?: string
    status?: string
    search?: string
    sent?: string
  }>
}

function parseYear(value: string | undefined, fallback: number): number {
  const year = Number.parseInt(value ?? "", 10)
  return Number.isInteger(year) && year >= 2020 && year <= 2100 ? year : fallback
}

function parseStatus(value: string | undefined): ReceiptStatus | undefined {
  return value === "VALID" || value === "CANCELLED" ? value : undefined
}

function parseSent(value: string | undefined): ReceiptSentFilter | undefined {
  return value === "si" || value === "no" ? value : undefined
}

export default async function ReceiptsPage({ searchParams }: PageProps) {
  const resolved = await searchParams
  const year = parseYear(resolved.year, todayInRome().getUTCFullYear())
  const status = parseStatus(resolved.status)
  const search = resolved.search ?? ""
  const sent = parseSent(resolved.sent)

  const [{ items, summary }, years, quota] = await Promise.all([
    listReceipts({ year, status, search, sent }),
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
            status={status}
            search={search}
            sent={sent}
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
            {summary.notSentCount > 0
              ? ` · ${summary.notSentCount} da inviare per email`
              : ""}
          </p>

          {items.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <h3 className="text-sm font-medium">Nessuna ricevuta trovata</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {sent
                  ? "Nessuna ricevuta con questo stato di invio: prova a togliere il filtro."
                  : "Le ricevute si emettono dall'elenco o dal dettaglio pagamenti."}
              </p>
            </div>
          ) : (
            <ReceiptsTable items={items} quota={quota} />
          )}
        </div>
      </ResourceContent>
    </>
  )
}
