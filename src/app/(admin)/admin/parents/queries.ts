import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"

type ListFilters = {
  search?: string
  limit?: number
  offset?: number
}

const DEFAULT_LIMIT = 50

export async function listParents(filters: ListFilters = {}) {
  await requireAdmin()

  const { search, limit = DEFAULT_LIMIT, offset = 0 } = filters

  const where: Prisma.ParentWhereInput = {
    deletedAt: null,
    ...(search && search.trim().length > 0
      ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  }

  const [items, totalCount] = await Promise.all([
    prisma.parent.findMany({
      where,
      include: {
        _count: {
          select: {
            athleteRelations: {
              where: { athlete: { deletedAt: null } },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.parent.count({ where }),
  ])

  return { items, totalCount }
}

export async function getParentById(id: string) {
  await requireAdmin()

  return prisma.parent.findUnique({
    where: { id, deletedAt: null },
    include: {
      athleteRelations: {
        where: { athlete: { deletedAt: null } },
        include: { athlete: true },
      },
    },
  })
}
