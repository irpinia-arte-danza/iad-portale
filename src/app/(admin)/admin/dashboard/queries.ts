import { AthleteStatus, ScheduleStatus } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"
import { withActiveScheduleFilter } from "@/lib/queries/active-schedule-filter"

export async function getDashboardStats() {
  await requireAdmin()

  const now = new Date()
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  )
  const firstOfMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  )
  const nextMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  )

  const [
    athletesTotal,
    athletesActive,
    athletesTrial,
    athletesSuspended,
    parentsTotal,
    schedulesOverdue,
    schedulesDueThisMonth,
    schedulesPaidThisMonth,
  ] = await Promise.all([
    prisma.athlete.count({ where: { deletedAt: null } }),
    prisma.athlete.count({
      where: { deletedAt: null, status: AthleteStatus.ACTIVE },
    }),
    prisma.athlete.count({
      where: { deletedAt: null, status: AthleteStatus.TRIAL },
    }),
    prisma.athlete.count({
      where: { deletedAt: null, status: AthleteStatus.SUSPENDED },
    }),
    prisma.parent.count({ where: { deletedAt: null } }),
    prisma.paymentSchedule.count({
      where: withActiveScheduleFilter({
        status: ScheduleStatus.DUE,
        dueDate: { lt: today },
      }),
    }),
    prisma.paymentSchedule.count({
      where: withActiveScheduleFilter({
        status: ScheduleStatus.DUE,
        dueDate: { gte: today, lt: nextMonth },
      }),
    }),
    prisma.paymentSchedule.count({
      where: withActiveScheduleFilter({
        status: ScheduleStatus.PAID,
        updatedAt: { gte: firstOfMonth, lt: nextMonth },
      }),
    }),
  ])

  return {
    athletesTotal,
    athletesActive,
    athletesTrial,
    athletesSuspended,
    parentsTotal,
    schedulesOverdue,
    schedulesDueThisMonth,
    schedulesPaidThisMonth,
  }
}

export async function getScadenzeKPI() {
  await requireAdmin()

  const now = new Date()
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  )
  const in7days = new Date(today)
  in7days.setUTCDate(in7days.getUTCDate() + 7)

  const [inRitardo, inScadenza7gg] = await Promise.all([
    prisma.paymentSchedule.aggregate({
      where: withActiveScheduleFilter({
        status: ScheduleStatus.DUE,
        dueDate: { lt: today },
      }),
      _sum: { amountCents: true },
      _count: true,
    }),
    prisma.paymentSchedule.aggregate({
      where: withActiveScheduleFilter({
        status: ScheduleStatus.DUE,
        dueDate: { gte: today, lte: in7days },
      }),
      _sum: { amountCents: true },
      _count: true,
    }),
  ])

  const inRitardoCount = inRitardo._count
  const inRitardoAmount = inRitardo._sum.amountCents ?? 0
  const inScadenzaCount = inScadenza7gg._count
  const inScadenzaAmount = inScadenza7gg._sum.amountCents ?? 0

  return {
    inRitardo: {
      count: inRitardoCount,
      amountCents: inRitardoAmount,
    },
    inScadenza7gg: {
      count: inScadenzaCount,
      amountCents: inScadenzaAmount,
    },
    total: {
      count: inRitardoCount + inScadenzaCount,
      amountCents: inRitardoAmount + inScadenzaAmount,
    },
  }
}

export type ScadenzeKPI = Awaited<ReturnType<typeof getScadenzeKPI>>

export async function getRecentAthletes(limit = 5) {
  await requireAdmin()
  return prisma.athlete.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      createdAt: true,
      status: true,
    },
  })
}

export async function getUpcomingStages(limit = 3) {
  await requireAdmin()
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  return prisma.stage.findMany({
    where: {
      deletedAt: null,
      date: { gte: today },
    },
    orderBy: { date: "asc" },
    take: limit,
    include: {
      _count: { select: { enrollments: true } },
    },
  })
}

export async function countUpcomingStages() {
  await requireAdmin()
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  return prisma.stage.count({
    where: { deletedAt: null, date: { gte: today } },
  })
}

export async function getCurrentShowcaseStats() {
  await requireAdmin()

  const ay = await prisma.academicYear.findFirst({
    where: { isCurrent: true },
    select: { id: true, label: true },
  })
  if (!ay) return null

  const showcase = await prisma.showcase.findUnique({
    where: { academicYearId: ay.id },
    select: {
      id: true,
      title: true,
      date: true,
      deletedAt: true,
      participations: {
        select: {
          id: true,
          confirmed: true,
          paymentSchedules: {
            select: { status: true, feeType: true },
          },
          costumeAssignments: {
            where: { costume: { deletedAt: null } },
            select: { id: true, paid: true },
          },
        },
      },
      costumes: {
        where: { deletedAt: null },
        select: { id: true },
      },
    },
  })
  if (!showcase || showcase.deletedAt) {
    return { exists: false as const, academicYearLabel: ay.label }
  }

  let totalParticipants = 0
  let confirmed = 0
  let pending = 0
  let paidFirst = 0
  let paidSecond = 0
  let costumeAssignments = 0
  let costumePaid = 0
  for (const p of showcase.participations) {
    totalParticipants += 1
    if (p.confirmed) confirmed += 1
    else pending += 1
    for (const s of p.paymentSchedules) {
      if (s.status !== "PAID") continue
      if (s.feeType === "SHOWCASE_1") paidFirst += 1
      else if (s.feeType === "SHOWCASE_2") paidSecond += 1
    }
    for (const a of p.costumeAssignments) {
      costumeAssignments += 1
      if (a.paid) costumePaid += 1
    }
  }

  return {
    exists: true as const,
    id: showcase.id,
    title: showcase.title,
    date: showcase.date,
    academicYearLabel: ay.label,
    totalParticipants,
    confirmed,
    pending,
    paidFirst,
    paidSecond,
    costumesCount: showcase.costumes.length,
    costumeAssignments,
    costumePaid,
  }
}

export async function getRecentParents(limit = 5) {
  await requireAdmin()
  return prisma.parent.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      createdAt: true,
      _count: {
        select: {
          athleteRelations: { where: { athlete: { deletedAt: null } } },
        },
      },
    },
  })
}
