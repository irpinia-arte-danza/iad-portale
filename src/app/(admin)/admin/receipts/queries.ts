import { Prisma, ReceiptStatus } from "@prisma/client"

import { requireAdmin } from "@/lib/auth/require-admin"
import { todayInRome } from "@/lib/receipts/numbering"
import {
  deliveryLabel,
  type DeliveryTone,
  isToDeliver,
  type DeliveryState,
} from "@/lib/receipts/delivery"
import { getDeliveryStates } from "@/lib/receipts/delivery-status"
import {
  receiptEmailBlocker,
  type ReceiptEmailState,
} from "@/lib/receipts/receipt-email"
import { getReceiptEmailStates } from "@/lib/receipts/receipt-email-status"
import { prisma } from "@/lib/prisma"

// Il chip attivo nell'elenco
export type ReceiptDeliveryFilter =
  | "da-consegnare"
  | "consegnate"
  | "annullate"
  | "tutte"

export const RECEIPT_DELIVERY_FILTERS: ReceiptDeliveryFilter[] = [
  "da-consegnare",
  "consegnate",
  "annullate",
  "tutte",
]

export function parseReceiptDeliveryFilter(
  value: string | undefined,
): ReceiptDeliveryFilter {
  return RECEIPT_DELIVERY_FILTERS.includes(value as ReceiptDeliveryFilter)
    ? (value as ReceiptDeliveryFilter)
    : "da-consegnare"
}

export type ReceiptListFilters = {
  year: number
  stato?: ReceiptDeliveryFilter
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
  // Email, condivisione o consegna a mano: lo stesso predicato del riquadro
  // in dashboard e del contatore del menu
  delivery: DeliveryState
  deliveryLabel: { text: string; tone: DeliveryTone }
}

function matchesDeliveryFilter(
  row: { delivery: DeliveryState },
  stato: ReceiptDeliveryFilter,
): boolean {
  if (stato === "tutte") return true
  if (stato === "annullate") return row.delivery.cancelled
  if (stato === "consegnate") {
    return !row.delivery.cancelled && row.delivery.delivered
  }
  return isToDeliver(row.delivery)
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
      // Prima la data di emissione, poi il progressivo: col riavvio annuale
      // il progressivo non è più crescente lungo tutta la serie, e ordinarci
      // sopra metterebbe le ricevute di settembre prima di quelle di gennaio.
      // L'indice [issueDate, sequence] copre esattamente quest'ordine.
      orderBy: [{ issueDate: "asc" }, { sequence: "asc" }, { createdAt: "asc" }],
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

  const [emailStates, deliveryStates] = await Promise.all([
    getReceiptEmailStates(items.map((r) => r.id)),
    getDeliveryStates(items.map((r) => ({ id: r.id, status: r.status }))),
  ])

  const rows: ReceiptListRow[] = items.map((r) => {
    const delivery = deliveryStates[r.id]
    return {
      ...r,
      emailState: emailStates[r.id],
      emailBlocker: receiptEmailBlocker(r),
      delivery,
      deliveryLabel: deliveryLabel(delivery),
    }
  })

  // Lo stato di consegna non è una colonna: si ricava da EmailLog e
  // AuditLog, quindi il filtro si applica qui. Le ricevute di un anno sono
  // poche centinaia.
  const stato = filters.stato ?? "da-consegnare"
  const filtered = rows.filter((row) => matchesDeliveryFilter(row, stato))

  const counts: Record<ReceiptDeliveryFilter, number> = {
    "da-consegnare": 0,
    consegnate: 0,
    annullate: 0,
    tutte: rows.length,
  }
  for (const row of rows) {
    if (row.delivery.cancelled) counts.annullate += 1
    else if (row.delivery.delivered) counts.consegnate += 1
    else counts["da-consegnare"] += 1
  }

  return {
    items: filtered,
    counts,
    summary: {
      validCount: validTotals._count._all,
      validAmountCents: validTotals._sum.amountCents ?? 0,
      cancelledCount,
      toDeliverCount: counts["da-consegnare"],
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
