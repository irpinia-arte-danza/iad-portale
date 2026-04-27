import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"

export type CourseStatusFilter = "active" | "archived" | "all"

type ListFilters = {
  search?: string
  status?: CourseStatusFilter
  limit?: number
  offset?: number
}

const DEFAULT_LIMIT = 50

export async function listCourses(filters: ListFilters = {}) {
  await requireAdmin()

  const {
    search,
    status = "active",
    limit = DEFAULT_LIMIT,
    offset = 0,
  } = filters

  const where: Prisma.CourseWhereInput = {
    ...(status === "active"
      ? { isActive: true }
      : status === "archived"
        ? { isActive: false }
        : {}),
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
        teacherCourses: {
          where: { teacher: { deletedAt: null } },
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
          select: {
            isPrimary: true,
            teacher: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
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

const courseWithRelations = Prisma.validator<Prisma.CourseDefaultArgs>()({
  include: {
    teacher: {
      select: { id: true, firstName: true, lastName: true },
    },
    teacherCourses: {
      where: { teacher: { deletedAt: null } },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      select: {
        isPrimary: true,
        teacher: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    },
    enrollments: {
      include: {
        athlete: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            status: true,
          },
        },
        academicYear: {
          select: { id: true, label: true, isCurrent: true },
        },
      },
      orderBy: [
        { academicYear: { label: "desc" } },
        { enrollmentDate: "desc" },
      ],
    },
    schedules: {
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    },
  },
})

export type CourseWithRelations = Prisma.CourseGetPayload<
  typeof courseWithRelations
>

export async function getCourseById(
  id: string,
): Promise<CourseWithRelations | null> {
  await requireAdmin()

  return prisma.course.findUnique({
    where: { id },
    ...courseWithRelations,
  })
}

export async function getCourseStatusCounts() {
  await requireAdmin()
  const [active, archived] = await Promise.all([
    prisma.course.count({ where: { isActive: true } }),
    prisma.course.count({ where: { isActive: false } }),
  ])
  return { active, archived, all: active + archived }
}

export async function listActiveTeachers() {
  await requireAdmin()

  return prisma.teacher.findMany({
    where: { deletedAt: null, isActive: true },
    select: { id: true, firstName: true, lastName: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  })
}
