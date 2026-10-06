import { bilancioPresetRange } from "@/lib/bilancio/periods"
import { todayDateOnly } from "@/lib/utils/date-only"
import { toDateInputValue } from "@/lib/utils/format"

import { ResourceContent } from "../../_components/resource-content"
import { ResourceHeader } from "../../_components/resource-header"

import { getBilancio } from "./queries"
import { BilancioEntrateSection } from "./_components/bilancio-entrate-section"
import { BilancioFilters } from "./_components/bilancio-filters"
import { BilancioSummary } from "./_components/bilancio-summary"
import { BilancioTrendChart } from "./_components/bilancio-trend-chart"
import { BilancioUsciteSection } from "./_components/bilancio-uscite-section"

interface PageProps {
  searchParams: Promise<{
    from?: string
    to?: string
  }>
}

function parseDateBoundary(
  iso: string | undefined,
  fallback: Date,
  endOfDay: boolean,
): { iso: string; date: Date } {
  if (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split("-").map(Number)
    const date = new Date(y, m - 1, d, 0, 0, 0, 0)
    if (!Number.isNaN(date.getTime())) {
      if (endOfDay) date.setHours(23, 59, 59, 999)
      return { iso, date }
    }
  }
  const d = new Date(fallback)
  if (endOfDay) d.setHours(23, 59, 59, 999)
  else d.setHours(0, 0, 0, 0)
  return { iso: toDateInputValue(fallback), date: d }
}

export default async function BilancioPage({ searchParams }: PageProps) {
  const resolved = await searchParams

  const now = new Date()
  const fiscalStart = new Date(now.getFullYear(), 0, 1)
  const fiscalEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)

  // Senza periodo nell'URL si apre sull'anno fiscale, calcolato sul giorno
  // di Roma con la stessa funzione dei chip: così il chip "Anno fiscale"
  // risulta acceso anche nei minuti dopo la mezzanotte di Capodanno, quando
  // per il server (UTC) è ancora l'anno prima
  const todayIso = todayDateOnly().toISOString().slice(0, 10)
  const fiscalYear = bilancioPresetRange("anno-fiscale", todayIso)

  const { iso: fromIso, date: from } = parseDateBoundary(
    resolved.from ?? fiscalYear.from,
    fiscalStart,
    false,
  )
  const { iso: toIso, date: to } = parseDateBoundary(
    resolved.to ?? fiscalYear.to,
    fiscalEnd,
    true,
  )

  const result = await getBilancio({ from, to })

  return (
    <>
      <ResourceHeader
        breadcrumbs={[{ label: "Bilancio" }]}
        title="Bilancio"
        description="Entrate, uscite e avanzo di gestione del periodo."
      />
      <ResourceContent>
        <div className="flex flex-col gap-6">
          <BilancioFilters
            from={fromIso}
            to={toIso}
            todayIso={todayIso}
          />
          <BilancioSummary totals={result.totals} />
          <BilancioTrendChart data={result.monthly} />
          <div className="grid gap-6 xl:grid-cols-2">
            <BilancioEntrateSection
              entries={result.entrateByType}
              totalCents={result.totals.entrateCents}
            />
            <BilancioUsciteSection
              entries={result.usciteByType}
              totalCents={result.totals.usciteCents}
            />
          </div>
        </div>
      </ResourceContent>
    </>
  )
}

