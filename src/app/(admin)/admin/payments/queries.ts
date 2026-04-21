import {
  AthleteStatus,
  FeeType,
  PaymentStatus,
  Prisma,
} from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"

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

  const where: Prisma.PaymentWhereInput = {
    deletedAt: null,
    ...(feeType ? { feeType } : {}),
    ...(status ? { status } : {}),
    ...(search && search.trim().length > 0
      ? {
          athlete: {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
            ],
          },
        }
      : {}),
  }

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
    enrollments: {
      where: {
        withdrawalDate: null,
        academicYear: { isCurrent: true },
      },
      select: {
        id: true,
        course: {
          select: { id: true, name: true, monthlyFeeCents: true },
        },
      },
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
