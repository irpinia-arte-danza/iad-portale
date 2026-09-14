import { Prisma, ReceiptStatus } from "@prisma/client"

import { requireAdmin } from "@/lib/auth/require-admin"
import { todayInRome } from "@/lib/receipts/numbering"
import { prisma } from "@/lib/prisma"

export type ReceiptListFilters = {
  year: number
  status?: ReceiptStatus
  search?: string
}

const receiptListItem = Prisma.validator<Prisma.ReceiptDefaultArgs>()({
  select: {
    id: true,
    receiptNumber: true,
    sequence: true,
    issueDate: true,
    status: true,
    payerName: true,
    athleteName: true,
    amountCents: true,
    cancelledAt: true,
    payment: {
      select: {
        id: true,
        athleteId: true,
        paymentDate: true,
        amountCents: true,
      },
    },
  },
})

export type ReceiptListItem = Prisma.ReceiptGetPayload<typeof receiptListItem>

// Registro ricevute di un anno solare (data di emissione), in ordine di
// numero: la vista che chiede il commercialista.
export async function listReceipts(filters: ReceiptListFilters) {
  await requireAdmin()

  const from = new Date(Date.UTC(filters.year, 0, 1))
  const to = new Date(Date.UTC(filters.year + 1, 0, 1))
  const search = filters.search?.trim()

  const yearWhere: Prisma.ReceiptWhereInput = {
    issueDate: { gte: from, lt: to },
  }

  const where: Prisma.ReceiptWhereInput = {
    ...yearWhere,
    ...(filters.status ? { status: filters.status } : {}),
    ...(search
      ? {
          OR: [
            { receiptNumber: { contains: search, mode: "insensitive" } },
            { athleteName: { contains: search, mode: "insensitive" } },
            { payerName: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  }

  const [items, validTotals, cancelledCount] = await Promise.all([
    prisma.receipt.findMany({
      where,
      ...receiptListItem,
      orderBy: [{ sequence: "asc" }, { issueDate: "asc" }, { createdAt: "asc" }],
    }),
    prisma.receipt.aggregate({
      where: { ...yearWhere, status: ReceiptStatus.VALID },
      _count: { _all: true },
      _sum: { amountCents: true },
    }),
    prisma.receipt.count({
      where: { ...yearWhere, status: ReceiptStatus.CANCELLED },
    }),
  ])

  return {
    items,
    summary: {
      validCount: validTotals._count._all,
      validAmountCents: validTotals._sum.amountCents ?? 0,
      cancelledCount,
    },
  }
}

// Anni con ricevute emesse, più l'anno corrente (anche se ancora vuoto).
export async function listReceiptYears(): Promise<number[]> {
  await requireAdmin()

  const range = await prisma.receipt.aggregate({
    _min: { issueDate: true },
    _max: { issueDate: true },
  })
  const currentYear = todayInRome().getUTCFullYear()
  const first = range._min.issueDate?.getUTCFullYear() ?? currentYear
  const last = Math.max(range._max.issueDate?.getUTCFullYear() ?? currentYear, currentYear)

  const years: number[] = []
  for (let year = last; year >= first; year--) years.push(year)
  return years
}
