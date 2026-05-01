import { Prisma, ScheduleStatus } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"
import { withActiveScheduleFilter } from "@/lib/queries/active-schedule-filter"

export type ScadenzeStatoFilter =
  | "DEFAULT"
  | "IN_RITARDO"
  | "IN_SCADENZA_7GG"
  | "TUTTE"

export type ScadenzeSort = "dueDate_asc" | "dueDate_desc" | "amount_desc"

export type ScadenzeFilter = {
  stato: ScadenzeStatoFilter
  courseId?: string
  academicYearId?: string
  search?: string
  sortBy?: ScadenzeSort
}

export type ScadenzaWithDetails = {
  id: string
  dueDate: Date
  amountCents: number
  status: ScheduleStatus
  feeType: string
  giorniRitardo: number // > 0 se scaduta, 0 = oggi, < 0 = in scadenza futura

  athlete: {
    id: string
    firstName: string
    lastName: string
  }
  parent: {
    id: string
    firstName: string
    lastName: string
    email: string | null
    phone: string | null
  } | null
  course: {
    id: string
    name: string
  } | null
  academicYear: {
    id: string
    label: string
  }

  ultimoSollecito: Date | null
  emailCount: number
}

function startOfUTCToday(): Date {
  const now = new Date()
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  )
}

function buildWhere(filter: ScadenzeFilter): Prisma.PaymentScheduleWhereInput {
  const today = startOfUTCToday()
  const in7days = new Date(today)
  in7days.setUTCDate(in7days.getUTCDate() + 7)

  const base: Prisma.PaymentScheduleWhereInput = {
    status: ScheduleStatus.DUE,
  }

  switch (filter.stato) {
    case "IN_RITARDO":
      base.dueDate = { lt: today }
      break
    case "IN_SCADENZA_7GG":
      base.dueDate = { gte: today, lte: in7days }
      break
    case "DEFAULT":
      base.dueDate = { lte: in7days }
      break
    case "TUTTE":
      break
  }

  if (filter.academicYearId) {
    base.academicYearId = filter.academicYearId
  }

  if (filter.courseId) {
    base.courseEnrollment = {
      courseId: filter.courseId,
    }
  }

  if (filter.search && filter.search.trim().length > 0) {
    const q = filter.search.trim()
    base.courseEnrollment = {
      ...(base.courseEnrollment as Prisma.CourseEnrollmentWhereInput | undefined),
      athlete: {
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          {
            parentRelations: {
              some: {
                parent: {
                  OR: [
                    { firstName: { contains: q, mode: "insensitive" } },
                    { lastName: { contains: q, mode: "insensitive" } },
                  ],
                },
              },
            },
          },
        ],
      },
    }
  }

  return withActiveScheduleFilter(base)
}

function buildOrderBy(
  sort: ScadenzeSort = "dueDate_asc",
): Prisma.PaymentScheduleOrderByWithRelationInput {
  switch (sort) {
    case "dueDate_desc":
      return { dueDate: "desc" }
    case "amount_desc":
      return { amountCents: "desc" }
    default:
      return { dueDate: "asc" }
  }
}

export async function getScadenze(
  filter: ScadenzeFilter,
): Promise<ScadenzaWithDetails[]> {
  await requireAdmin()

  const where = buildWhere(filter)
  const orderBy = buildOrderBy(filter.sortBy)

  const schedules = await prisma.paymentSchedule.findMany({
    where,
    orderBy,
    include: {
      academicYear: { select: { id: true, label: true } },
      courseEnrollment: {
        select: {
          id: true,
          course: { select: { id: true, name: true } },
          athlete: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              parentRelations: {
                where: { parent: { deletedAt: null } },
                orderBy: [
                  { isPrimaryPayer: "desc" },
                  { isPrimaryContact: "desc" },
                ],
                take: 1,
                select: {
                  parent: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      email: true,
                      phone: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  const scheduleIds = schedules.map((s) => s.id)

  const emailAggregates =
    scheduleIds.length > 0
      ? await prisma.emailLog.groupBy({
          by: ["paymentScheduleId"],
          where: { paymentScheduleId: { in: scheduleIds } },
          _count: { _all: true },
          _max: { sentAt: true },
        })
      : []

  const emailMap = new Map<string, { count: number; lastSent: Date | null }>()
  for (const agg of emailAggregates) {
    if (!agg.paymentScheduleId) continue
    emailMap.set(agg.paymentScheduleId, {
      count: agg._count._all,
      lastSent: agg._max.sentAt,
    })
  }

  const today = startOfUTCToday()

  return schedules.map((s) => {
    const athlete = s.courseEnrollment.athlete
    const parentRel = athlete.parentRelations[0] ?? null
    const email = emailMap.get(s.id)

    const dueUTC = new Date(
      Date.UTC(
        s.dueDate.getUTCFullYear(),
        s.dueDate.getUTCMonth(),
        s.dueDate.getUTCDate(),
      ),
    )
    const giorniRitardo = Math.round(
      (today.getTime() - dueUTC.getTime()) / (1000 * 60 * 60 * 24),
    )

    return {
      id: s.id,
      dueDate: s.dueDate,
      amountCents: s.amountCents,
      status: s.status,
      feeType: s.feeType,
      giorniRitardo,
      athlete: {
        id: athlete.id,
        firstName: athlete.firstName,
        lastName: athlete.lastName,
      },
      parent: parentRel
        ? {
            id: parentRel.parent.id,
            firstName: parentRel.parent.firstName,
            lastName: parentRel.parent.lastName,
            email: parentRel.parent.email,
            phone: parentRel.parent.phone,
          }
        : null,
      course: s.courseEnrollment.course,
      academicYear: {
        id: s.academicYear.id,
        label: s.academicYear.label,
      },
      ultimoSollecito: email?.lastSent ?? null,
      emailCount: email?.count ?? 0,
    }
  })
}

export async function listCoursesForFilter() {
  await requireAdmin()
  return prisma.course.findMany({
    where: { isActive: true, deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })
}

export async function listAcademicYearsForFilter() {
  await requireAdmin()
  return prisma.academicYear.findMany({
    select: { id: true, label: true, isCurrent: true },
    orderBy: { startDate: "desc" },
  })
}

export async function getCurrentAcademicYear() {
  await requireAdmin()
  return prisma.academicYear.findFirst({
    where: { isCurrent: true },
    select: { id: true, label: true },
  })
}
