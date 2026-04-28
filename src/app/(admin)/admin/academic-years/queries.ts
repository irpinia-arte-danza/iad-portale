import "server-only"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"

export async function listAcademicYears() {
  await requireAdmin()
  return prisma.academicYear.findMany({
    orderBy: [{ startDate: "desc" }],
    include: {
      _count: {
        select: {
          enrollments: true,
          payments: true,
          lessons: true,
        },
      },
    },
  })
}

export type AcademicYearRow = Awaited<
  ReturnType<typeof listAcademicYears>
>[number]

export async function getAcademicYearStats(id: string) {
  await requireAdmin()
  return prisma.academicYear.findUnique({
    where: { id },
    select: {
      id: true,
      label: true,
      isCurrent: true,
      _count: {
        select: {
          enrollments: true,
          payments: true,
          lessons: true,
        },
      },
    },
  })
}
