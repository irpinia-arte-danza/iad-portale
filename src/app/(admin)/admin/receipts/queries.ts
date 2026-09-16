import { Prisma, ReceiptStatus } from "@prisma/client"

import { requireAdmin } from "@/lib/auth/require-admin"
import { todayInRome } from "@/lib/receipts/numbering"
import {
  receiptEmailBlocker,
  wasSent,
  type ReceiptEmailState,
} from "@/lib/receipts/receipt-email"
import { getReceiptEmailStates } from "@/lib/receipts/receipt-email-status"
import { prisma } from "@/lib/prisma"

// "si" = solo già inviate, "no" = solo da inviare
export type ReceiptSentFilter = "si" | "no"

export type ReceiptListFilters = {
  year: number
  status?: ReceiptStatus
  search?: string
  sent?: ReceiptSentFilter
}

const receiptListItem = Prisma.validator<Prisma.ReceiptDefaultArgs>()({
  select: {
    id: true,
    receiptNumber: true,
    sequence: true,
    issueDate: true,
    status: true,
    payerName: true,
    // Destinatario congelato: decide se la ricevuta è inviabile
    payerEmail: true,
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

// Riga dell'elenco con lo stato dell'invio, ricavato da EmailLog
export type ReceiptListRow = ReceiptListItem & {
  emailState: ReceiptEmailState
  // Motivo per cui non si può inviare (annullata, pagante senza email); null
  // se si può. Decide anche cosa è selezionabile per l'invio multiplo.
  emailBlocker: string | null
}

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

  const emailStates = await getReceiptEmailStates(items.map((r) => r.id))

  const rows: ReceiptListRow[] = items.map((r) => ({
    ...r,
    emailState: emailStates[r.id],
    emailBlocker: receiptEmailBlocker(r),
  }))

  // Il filtro "inviate / da inviare" si applica qui e non nella query: lo
  // stato non è una colonna di receipts, si ricava da EmailLog. Le ricevute
  // di un anno sono poche decine, la differenza non si nota.
  const filtered = filters.sent
    ? rows.filter((r) => wasSent(r.emailState) === (filters.sent === "si"))
    : rows

  return {
    items: filtered,
    summary: {
      validCount: validTotals._count._all,
      validAmountCents: validTotals._sum.amountCents ?? 0,
      cancelledCount,
      // Sul totale dell'anno, non sul filtro: dice quante restano da mandare
      notSentCount: rows.filter(
        (r) => !wasSent(r.emailState) && r.emailBlocker === null,
      ).length,
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
