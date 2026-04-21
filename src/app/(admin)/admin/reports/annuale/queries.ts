import { ExpenseType, PaymentMethod, Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"

export type SpeseFilters = {
  from: Date
  to: Date
  type?: ExpenseType
  method?: PaymentMethod
}

const speseItem = Prisma.validator<Prisma.ExpenseDefaultArgs>()({
  select: {
    id: true,
    expenseDate: true,
    type: true,
    method: true,
    amountCents: true,
    description: true,
    recipient: true,
  },
})

export type SpesaItem = Prisma.ExpenseGetPayload<typeof speseItem>

export type SpeseTotals = {
  grandTotalCents: number
  countItems: number
  byMethod: Record<PaymentMethod, { count: number; totalCents: number }>
  byType: Record<string, { count: number; totalCents: number }>
}

export type SpeseResult = {
  items: SpesaItem[]
  totals: SpeseTotals
}

function emptyByMethod(): Record<
  PaymentMethod,
  { count: number; totalCents: number }
> {
  return {
    CASH: { count: 0, totalCents: 0 },
    TRANSFER: { count: 0, totalCents: 0 },
    POS: { count: 0, totalCents: 0 },
    SUMUP_LINK: { count: 0, totalCents: 0 },
    OTHER: { count: 0, totalCents: 0 },
  }
}

export async function getSpese(filters: SpeseFilters): Promise<SpeseResult> {
  await requireAdmin()

  const { from, to, type, method } = filters

  const where: Prisma.ExpenseWhereInput = {
    deletedAt: null,
    expenseDate: { gte: from, lte: to },
    ...(type ? { type } : {}),
    ...(method ? { method } : {}),
  }

  const items = await prisma.expense.findMany({
    where,
    ...speseItem,
    orderBy: [{ expenseDate: "asc" }, { createdAt: "asc" }],
  })

  const byMethod = emptyByMethod()
  const byType: Record<string, { count: number; totalCents: number }> = {}
  let grandTotalCents = 0

  for (const item of items) {
    byMethod[item.method].count += 1
    byMethod[item.method].totalCents += item.amountCents

    if (!byType[item.type]) {
      byType[item.type] = { count: 0, totalCents: 0 }
    }
    byType[item.type].count += 1
    byType[item.type].totalCents += item.amountCents

    grandTotalCents += item.amountCents
  }

  return {
    items,
    totals: {
      grandTotalCents,
      countItems: items.length,
      byMethod,
      byType,
    },
  }
}

export type AvailableYear = {
  year: number
  fiscalYearId: string | null
  startDate: Date | null
  endDate: Date | null
  isCurrent: boolean
  isClosed: boolean
  hasData: boolean
}

export async function getAvailableYears(): Promise<AvailableYear[]> {
  await requireAdmin()

  const fiscalYears = await prisma.fiscalYear.findMany({
    orderBy: { year: "desc" },
    select: {
      id: true,
      year: true,
      startDate: true,
      endDate: true,
      isCurrent: true,
      isClosed: true,
      _count: {
        select: {
          payments: { where: { deletedAt: null, status: "PAID" } },
          expenses: { where: { deletedAt: null } },
        },
      },
    },
  })

  return fiscalYears.map((fy) => ({
    year: fy.year,
    fiscalYearId: fy.id,
    startDate: fy.startDate,
    endDate: fy.endDate,
    isCurrent: fy.isCurrent,
    isClosed: fy.isClosed,
    hasData: fy._count.payments + fy._count.expenses > 0,
  }))
}

export async function getFiscalYearByYear(year: number): Promise<{
  id: string
  year: number
  startDate: Date
  endDate: Date
} | null> {
  await requireAdmin()

  const fy = await prisma.fiscalYear.findUnique({
    where: { year },
    select: { id: true, year: true, startDate: true, endDate: true },
  })

  return fy
}
