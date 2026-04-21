import { AthleteStatus } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"

export async function getDashboardStats() {
  await requireAdmin()

  const [
    athletesTotal,
    athletesActive,
    athletesTrial,
    athletesSuspended,
    parentsTotal,
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
  ])

  return {
    athletesTotal,
    athletesActive,
    athletesTrial,
    athletesSuspended,
    parentsTotal,
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
