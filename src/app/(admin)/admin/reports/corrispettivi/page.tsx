import { FeeType, PaymentMethod } from "@prisma/client"

import {
  endOfMonth,
  startOfMonth,
  toDateInputValue,
} from "@/lib/utils/format"

import { ResourceContent } from "../../_components/resource-content"
import { ResourceHeader } from "../../_components/resource-header"

import { getCorrispettivi } from "./queries"
import { CorrispettiviExportButtons } from "./_components/corrispettivi-export-buttons"
import { CorrispettiviFilters } from "./_components/corrispettivi-filters"
import { CorrispettiviTable } from "./_components/corrispettivi-table"

interface PageProps {
  searchParams: Promise<{
    from?: string
    to?: string
    feeType?: string
    method?: string
  }>
}

const FEE_TYPES: FeeType[] = [
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

const METHODS: PaymentMethod[] = [
  "CASH",
  "TRANSFER",
  "POS",
  "SUMUP_LINK",
  "OTHER",
]

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

function parseFeeType(value: string | undefined): FeeType | undefined {
  if (!value) return undefined
  return FEE_TYPES.includes(value as FeeType)
    ? (value as FeeType)
    : undefined
}

function parseMethod(value: string | undefined): PaymentMethod | undefined {
  if (!value) return undefined
  return METHODS.includes(value as PaymentMethod)
    ? (value as PaymentMethod)
    : undefined
}

export default async function CorrispettiviPage({ searchParams }: PageProps) {
  const resolved = await searchParams

  const now = new Date()
  const { iso: fromIso, date: from } = parseDateBoundary(
    resolved.from,
    startOfMonth(now),
    false,
  )
  const { iso: toIso, date: to } = parseDateBoundary(
    resolved.to,
    endOfMonth(now),
    true,
  )

  const feeType = parseFeeType(resolved.feeType)
  const method = parseMethod(resolved.method)

  const result = await getCorrispettivi({ from, to, feeType, method })

  return (
    <>
      <ResourceHeader
        breadcrumbs={[{ label: "Corrispettivi" }]}
        title="Registro corrispettivi"
        description="Entrate giorno per giorno. Export per commercialista."
        action={
          <CorrispettiviExportButtons
            from={fromIso}
            to={toIso}
            feeType={feeType}
            method={method}
            hasData={result.items.length > 0}
          />
        }
      />
      <ResourceContent>
        <div className="flex flex-col gap-4">
          <CorrispettiviFilters
            defaultFrom={fromIso}
            defaultTo={toIso}
            defaultFeeType={feeType}
            defaultMethod={method}
          />
          <CorrispettiviTable days={result.days} totals={result.totals} />
        </div>
      </ResourceContent>
    </>
  )
}
