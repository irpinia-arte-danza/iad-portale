import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"

type ListFilters = {
  search?: string
  limit?: number
  offset?: number
}

const DEFAULT_LIMIT = 50

export async function listTeachers(filters: ListFilters = {}) {
  await requireAdmin()

  const { search, limit = DEFAULT_LIMIT, offset = 0 } = filters

  const where: Prisma.TeacherWhereInput = {
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
    prisma.teacher.findMany({
      where,
      include: {
        _count: {
          select: { courses: true },
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: limit,
      skip: offset,
    }),
    prisma.teacher.count({ where }),
  ])

  return { items, totalCount }
}

export async function getTeacherById(id: string) {
  await requireAdmin()

  return prisma.teacher.findUnique({
    where: { id, deletedAt: null },
    include: {
      _count: {
        select: { courses: true },
      },
    },
  })
}
