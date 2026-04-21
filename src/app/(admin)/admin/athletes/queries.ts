import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"

type ListFilters = {
  search?: string
  limit?: number
  offset?: number
}

const DEFAULT_LIMIT = 50

export async function listAthletes(filters: ListFilters = {}) {
  await requireAdmin()

  const { search, limit = DEFAULT_LIMIT, offset = 0 } = filters

  const where: Prisma.AthleteWhereInput = {
    deletedAt: null,
    ...(search && search.trim().length > 0
      ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  }

  const [items, totalCount] = await Promise.all([
    prisma.athlete.findMany({
      where,
      include: {
        _count: {
          select: {
            parentRelations: {
              where: { parent: { deletedAt: null } },
            },
          },
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: limit,
      skip: offset,
    }),
    prisma.athlete.count({ where }),
  ])

  return { items, totalCount }
}

const athleteWithRelations = Prisma.validator<Prisma.AthleteDefaultArgs>()({
  include: {
    parentRelations: {
      where: { parent: { deletedAt: null } },
      include: { parent: true },
      orderBy: [
        { isPrimaryContact: "desc" },
        { isPrimaryPayer: "desc" },
      ],
    },
  },
})

export type AthleteWithRelations = Prisma.AthleteGetPayload<
  typeof athleteWithRelations
>

export async function getAthleteById(
  id: string,
): Promise<AthleteWithRelations | null> {
  await requireAdmin()

  return prisma.athlete.findUnique({
    where: { id, deletedAt: null },
    ...athleteWithRelations,
  })
}
