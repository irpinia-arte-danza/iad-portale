import { ExpenseType, FeeType, Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"
import { monthKey, monthLabel } from "@/lib/utils/format"

export type BilancioFilters = {
  from: Date
  to: Date
}

export type BilancioTotals = {
  entrateCents: number
  usciteCents: number
  netCents: number
  marginPercent: number
  countEntrate: number
  countUscite: number
}

export type BilancioFeeTypeEntry = {
  type: FeeType
  count: number
  totalCents: number
  share: number
}

export type BilancioExpenseTypeEntry = {
  type: ExpenseType
  count: number
  totalCents: number
  share: number
}

export type BilancioMonthlyPoint = {
  monthKey: string
  monthLabel: string
  entrateCents: number
  usciteCents: number
  netCents: number
}

export type BilancioResult = {
  totals: BilancioTotals
  entrateByType: BilancioFeeTypeEntry[]
  usciteByType: BilancioExpenseTypeEntry[]
  monthly: BilancioMonthlyPoint[]
}

function addMonths(date: Date, n: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + n, 1)
}

function buildMonthBuckets(
  from: Date,
  to: Date,
): Map<string, BilancioMonthlyPoint> {
  const buckets = new Map<string, BilancioMonthlyPoint>()
  let cursor = new Date(from.getFullYear(), from.getMonth(), 1)
  const end = new Date(to.getFullYear(), to.getMonth(), 1)
  while (cursor.getTime() <= end.getTime()) {
    const key = monthKey(cursor)
    buckets.set(key, {
      monthKey: key,
      monthLabel: monthLabel(cursor),
      entrateCents: 0,
      usciteCents: 0,
      netCents: 0,
    })
    cursor = addMonths(cursor, 1)
  }
  return buckets
}

export async function getBilancio(
  filters: BilancioFilters,
): Promise<BilancioResult> {
  await requireAdmin()

  const { from, to } = filters

  const paymentWhere: Prisma.PaymentWhereInput = {
    deletedAt: null,
    status: "PAID",
    paymentDate: { gte: from, lte: to },
  }

  const expenseWhere: Prisma.ExpenseWhereInput = {
    deletedAt: null,
    expenseDate: { gte: from, lte: to },
  }

  const [payments, expenses] = await Promise.all([
    prisma.payment.findMany({
      where: paymentWhere,
      select: {
        id: true,
        amountCents: true,
        feeType: true,
        paymentDate: true,
      },
    }),
    prisma.expense.findMany({
      where: expenseWhere,
      select: {
        id: true,
        amountCents: true,
        type: true,
        expenseDate: true,
      },
    }),
  ])

  const monthly = buildMonthBuckets(from, to)

  const entrateMap = new Map<
    FeeType,
    { count: number; totalCents: number }
  >()
  let entrateCents = 0
  for (const p of payments) {
    entrateCents += p.amountCents
    const prev = entrateMap.get(p.feeType) ?? { count: 0, totalCents: 0 }
    entrateMap.set(p.feeType, {
      count: prev.count + 1,
      totalCents: prev.totalCents + p.amountCents,
    })
    const mk = monthKey(p.paymentDate)
    const bucket = monthly.get(mk)
    if (bucket) {
      bucket.entrateCents += p.amountCents
    }
  }

  const usciteMap = new Map<
    ExpenseType,
    { count: number; totalCents: number }
  >()
  let usciteCents = 0
  for (const e of expenses) {
    usciteCents += e.amountCents
    const prev = usciteMap.get(e.type) ?? { count: 0, totalCents: 0 }
    usciteMap.set(e.type, {
      count: prev.count + 1,
      totalCents: prev.totalCents + e.amountCents,
    })
    const mk = monthKey(e.expenseDate)
    const bucket = monthly.get(mk)
    if (bucket) {
      bucket.usciteCents += e.amountCents
    }
  }

  for (const bucket of monthly.values()) {
    bucket.netCents = bucket.entrateCents - bucket.usciteCents
  }

  const entrateByType: BilancioFeeTypeEntry[] = Array.from(
    entrateMap.entries(),
  )
    .map(([type, v]) => ({
      type,
      count: v.count,
      totalCents: v.totalCents,
      share: entrateCents > 0 ? v.totalCents / entrateCents : 0,
    }))
    .sort((a, b) => b.totalCents - a.totalCents)

  const usciteByType: BilancioExpenseTypeEntry[] = Array.from(
    usciteMap.entries(),
  )
    .map(([type, v]) => ({
      type,
      count: v.count,
      totalCents: v.totalCents,
      share: usciteCents > 0 ? v.totalCents / usciteCents : 0,
    }))
    .sort((a, b) => b.totalCents - a.totalCents)

  const netCents = entrateCents - usciteCents
  const marginPercent = entrateCents > 0 ? netCents / entrateCents : 0

  return {
    totals: {
      entrateCents,
      usciteCents,
      netCents,
      marginPercent,
      countEntrate: payments.length,
      countUscite: expenses.length,
    },
    entrateByType,
    usciteByType,
    monthly: Array.from(monthly.values()),
  }
}
