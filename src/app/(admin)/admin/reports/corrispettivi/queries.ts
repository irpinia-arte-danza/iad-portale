import { FeeType, PaymentMethod, Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"
import { dayKey } from "@/lib/utils/format"

export type CorrispettiviFilters = {
  from: Date
  to: Date
  feeType?: FeeType
  method?: PaymentMethod
}

const corrispettivoItem = Prisma.validator<Prisma.PaymentDefaultArgs>()({
  include: {
    athlete: {
      select: { id: true, firstName: true, lastName: true },
    },
    courseEnrollment: {
      select: {
        course: { select: { name: true } },
      },
    },
  },
})

export type CorrispettivoItem = Prisma.PaymentGetPayload<
  typeof corrispettivoItem
>

export type CorrispettiviDayGroup = {
  dayKey: string
  date: Date
  items: CorrispettivoItem[]
  subtotalCents: number
}

export type CorrispettiviTotals = {
  grandTotalCents: number
  countItems: number
  countDays: number
  byMethod: Record<PaymentMethod, { count: number; totalCents: number }>
  byFeeType: Record<string, { count: number; totalCents: number }>
}

export type CorrispettiviResult = {
  items: CorrispettivoItem[]
  days: CorrispettiviDayGroup[]
  totals: CorrispettiviTotals
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

export async function getCorrispettivi(
  filters: CorrispettiviFilters,
): Promise<CorrispettiviResult> {
  await requireAdmin()

  const { from, to, feeType, method } = filters

  const where: Prisma.PaymentWhereInput = {
    deletedAt: null,
    status: "PAID",
    paymentDate: { gte: from, lte: to },
    ...(feeType ? { feeType } : {}),
    ...(method ? { method } : {}),
  }

  const items = await prisma.payment.findMany({
    where,
    ...corrispettivoItem,
    orderBy: [{ paymentDate: "asc" }, { createdAt: "asc" }],
  })

  const dayMap = new Map<string, CorrispettiviDayGroup>()
  const byMethod = emptyByMethod()
  const byFeeType: Record<string, { count: number; totalCents: number }> = {}
  let grandTotalCents = 0

  for (const item of items) {
    const k = dayKey(item.paymentDate)
    let group = dayMap.get(k)
    if (!group) {
      group = {
        dayKey: k,
        date: item.paymentDate,
        items: [],
        subtotalCents: 0,
      }
      dayMap.set(k, group)
    }
    group.items.push(item)
    group.subtotalCents += item.amountCents

    byMethod[item.method].count += 1
    byMethod[item.method].totalCents += item.amountCents

    if (!byFeeType[item.feeType]) {
      byFeeType[item.feeType] = { count: 0, totalCents: 0 }
    }
    byFeeType[item.feeType].count += 1
    byFeeType[item.feeType].totalCents += item.amountCents

    grandTotalCents += item.amountCents
  }

  const days = Array.from(dayMap.values()).sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  )

  return {
    items,
    days,
    totals: {
      grandTotalCents,
      countItems: items.length,
      countDays: days.length,
      byMethod,
      byFeeType,
    },
  }
}
