import { AthleteStatus, ScheduleStatus } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"

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
      where: { status: ScheduleStatus.DUE, dueDate: { lt: today } },
    }),
    prisma.paymentSchedule.count({
      where: {
        status: ScheduleStatus.DUE,
        dueDate: { gte: today, lt: nextMonth },
      },
    }),
    prisma.paymentSchedule.count({
      where: {
        status: ScheduleStatus.PAID,
        updatedAt: { gte: firstOfMonth, lt: nextMonth },
      },
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
      where: {
        status: ScheduleStatus.DUE,
        dueDate: { lt: today },
      },
      _sum: { amountCents: true },
      _count: true,
    }),
    prisma.paymentSchedule.aggregate({
      where: {
        status: ScheduleStatus.DUE,
        dueDate: { gte: today, lte: in7days },
      },
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
