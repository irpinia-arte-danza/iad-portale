import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"

type ListFilters = {
  search?: string
  limit?: number
  offset?: number
}

const DEFAULT_LIMIT = 50

export async function listCourses(filters: ListFilters = {}) {
  await requireAdmin()

  const { search, limit = DEFAULT_LIMIT, offset = 0 } = filters

  const where: Prisma.CourseWhereInput = {
    ...(search && search.trim().length > 0
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { level: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  }

  const [items, totalCount] = await Promise.all([
    prisma.course.findMany({
      where,
      include: {
        teacher: {
          select: { id: true, firstName: true, lastName: true },
        },
        _count: {
          select: { enrollments: true },
        },
      },
      orderBy: [{ name: "asc" }],
      take: limit,
      skip: offset,
    }),
    prisma.course.count({ where }),
  ])

  return { items, totalCount }
}

export async function getCourseById(id: string) {
  await requireAdmin()

  return prisma.course.findUnique({
    where: { id },
    include: {
      teacher: {
        select: { id: true, firstName: true, lastName: true },
      },
      _count: {
        select: { enrollments: true },
      },
    },
  })
}

export async function listActiveTeachers() {
  await requireAdmin()

  return prisma.teacher.findMany({
    where: { deletedAt: null, isActive: true },
    select: { id: true, firstName: true, lastName: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  })
}
