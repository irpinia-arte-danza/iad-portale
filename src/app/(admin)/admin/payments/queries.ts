import {
  AthleteStatus,
  FeeType,
  PaymentStatus,
  Prisma,
  ScheduleStatus,
} from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"
import {
  SCHEDULE_LINE_SELECT,
  athleteIdOfSchedule,
  compareScheduleLines,
  describeScheduleAdmin,
} from "@/lib/payments/schedule-lines"
import { withActiveCourseOrStageScheduleFilter } from "@/lib/queries/active-schedule-filter"
import { feeTypeToReceiptCategory } from "@/lib/receipts/numbering"

type ListFilters = {
  search?: string
  feeType?: FeeType
  status?: PaymentStatus
  limit?: number
  offset?: number
}

const DEFAULT_LIMIT = 20

const paymentListItem = Prisma.validator<Prisma.PaymentDefaultArgs>()({
  include: {
    athlete: {
      select: { id: true, firstName: true, lastName: true },
    },
    parent: {
      select: { id: true, firstName: true, lastName: true },
    },
    courseEnrollment: {
      select: {
        id: true,
        course: { select: { id: true, name: true } },
      },
    },
    receipt: {
      select: { id: true, receiptNumber: true, status: true },
    },
    // Scadenze chiuse dal pagamento (anche più d'una)
    paymentSchedules: { select: SCHEDULE_LINE_SELECT },
  },
})

export type PaymentListItem = Prisma.PaymentGetPayload<typeof paymentListItem>

export async function listPayments(filters: ListFilters = {}) {
  await requireAdmin()

  const {
    search,
    feeType,
    status,
    limit = DEFAULT_LIMIT,
    offset = 0,
  } = filters

  const conditions: Prisma.PaymentWhereInput[] = [{ deletedAt: null }]
  // Un pagamento su più scadenze compare sotto ciascuno dei suoi tipi quota
  if (feeType) {
    conditions.push({
      OR: [{ feeType }, { paymentSchedules: { some: { feeType } } }],
    })
  }
  if (status) conditions.push({ status })
  if (search && search.trim().length > 0) {
    conditions.push({
      athlete: {
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
        ],
      },
    })
  }
  const where: Prisma.PaymentWhereInput = { AND: conditions }

  const [items, totalCount] = await Promise.all([
    prisma.payment.findMany({
      where,
      ...paymentListItem,
      orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
      take: limit,
      skip: offset,
    }),
    prisma.payment.count({ where }),
  ])

  return { items, totalCount }
}

const paymentWithRelations = Prisma.validator<Prisma.PaymentDefaultArgs>()({
  include: {
    athlete: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        fiscalCode: true,
      },
    },
    parent: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        fiscalCode: true,
      },
    },
    academicYear: {
      select: { id: true, label: true, isCurrent: true },
    },
    fiscalYear: {
      select: { id: true, year: true, isCurrent: true },
    },
    courseEnrollment: {
      select: {
        id: true,
        course: { select: { id: true, name: true, type: true } },
      },
    },
    receipt: {
      select: {
        id: true,
        receiptNumber: true,
        issueDate: true,
        status: true,
        cancelledAt: true,
        cancelReason: true,
        // Destinatario congelato: il pannello mostra se la ricevuta è
        // inviabile e a chi, senza ricavarlo di nuovo dal pagamento
        payerName: true,
        payerEmail: true,
        // Nome del file PDF condiviso, uguale a quello scaricato
        athleteName: true,
      },
    },
    paymentSchedules: { select: SCHEDULE_LINE_SELECT },
  },
})

export type PaymentWithRelations = Prisma.PaymentGetPayload<
  typeof paymentWithRelations
>

export async function getPaymentById(
  id: string,
): Promise<PaymentWithRelations | null> {
  await requireAdmin()

  return prisma.payment.findFirst({
    where: { id, deletedAt: null },
    ...paymentWithRelations,
  })
}

export async function listActiveAthletesForSelector() {
  await requireAdmin()

  return prisma.athlete.findMany({
    where: {
      deletedAt: null,
      status: { in: [AthleteStatus.ACTIVE, AthleteStatus.TRIAL] },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      status: true,
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  })
}

// Allieve per il form "Registra pagamento". Le scadenze da incassare arrivano
// a parte da listOpenSchedulesByAthlete.
const athleteWithFormRelations = Prisma.validator<Prisma.AthleteDefaultArgs>()({
  select: {
    id: true,
    firstName: true,
    lastName: true,
    status: true,
    parentRelations: {
      where: { parent: { deletedAt: null } },
      select: {
        isPrimaryPayer: true,
        parent: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: [{ isPrimaryPayer: "desc" }],
    },
  },
})

export type AthleteWithFormRelations = Prisma.AthleteGetPayload<
  typeof athleteWithFormRelations
>

export async function listAthletesWithRelations(): Promise<
  AthleteWithFormRelations[]
> {
  await requireAdmin()

  return prisma.athlete.findMany({
    where: {
      deletedAt: null,
      status: { in: [AthleteStatus.ACTIVE, AthleteStatus.TRIAL] },
    },
    ...athleteWithFormRelations,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  })
}

export type OpenScheduleOption = {
  id: string
  feeType: FeeType
  dueDate: Date
  amountCents: number
  description: string
  // Numerazione ricevute (quote / saggio / costumi): in un pagamento solo
  // scadenze della stessa
  category: string
}

// Scadenze da incassare per allieva: mensili dei corsi attivi, quota
// associativa, stage, saggio confermato, costumi. Ordinate come le righe
// della ricevuta.
export async function listOpenSchedulesByAthlete(
  athleteId?: string,
): Promise<Record<string, OpenScheduleOption[]>> {
  await requireAdmin()

  const ownerFilter: Prisma.PaymentScheduleWhereInput = athleteId
    ? {
        OR: [
          { athleteId },
          { courseEnrollment: { athleteId } },
          { stageEnrollment: { athleteId } },
          { showcaseParticipation: { athleteId } },
          { costumeAssignment: { participation: { athleteId } } },
        ],
      }
    : {}

  const schedules = await prisma.paymentSchedule.findMany({
    where: withActiveCourseOrStageScheduleFilter({
      AND: [
        {
          status: { in: [ScheduleStatus.DUE, ScheduleStatus.OVERDUE] },
          paymentId: null,
        },
        ownerFilter,
      ],
    }),
    select: SCHEDULE_LINE_SELECT,
  })

  const byAthlete: Record<string, OpenScheduleOption[]> = {}
  for (const s of schedules.sort(compareScheduleLines)) {
    if (s.showcaseParticipation && !s.showcaseParticipation.confirmed) continue
    const owner = athleteIdOfSchedule(s)
    if (!owner) continue
    const list = byAthlete[owner] ?? []
    list.push({
      id: s.id,
      feeType: s.feeType,
      dueDate: s.dueDate,
      amountCents: s.amountCents,
      // Elenco per l'admin: col corso, per distinguere due rate dello stesso mese
      description: describeScheduleAdmin(s),
      category: feeTypeToReceiptCategory(s.feeType),
    })
    byAthlete[owner] = list
  }
  return byAthlete
}

export async function listGuardiansForAthlete(athleteId: string) {
  await requireAdmin()

  const relations = await prisma.athleteParent.findMany({
    where: {
      athleteId,
      parent: { deletedAt: null },
    },
    select: {
      isPrimaryPayer: true,
      isPrimaryContact: true,
      parent: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
    orderBy: [
      { isPrimaryPayer: "desc" },
      { isPrimaryContact: "desc" },
    ],
  })

  return relations.map((r) => ({
    id: r.parent.id,
    firstName: r.parent.firstName,
    lastName: r.parent.lastName,
    isPrimaryPayer: r.isPrimaryPayer,
  }))
}

export async function listActiveEnrollmentsForAthlete(athleteId: string) {
  await requireAdmin()

  return prisma.courseEnrollment.findMany({
    where: {
      athleteId,
      withdrawalDate: null,
      academicYear: { isCurrent: true },
    },
    select: {
      id: true,
      course: {
        select: { id: true, name: true, monthlyFeeCents: true },
      },
      academicYear: {
        select: { id: true, label: true, isCurrent: true },
      },
    },
    orderBy: { enrollmentDate: "desc" },
  })
}
