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
