import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"
import { monthKey, monthLabel } from "@/lib/utils/format"

function subMonths(date: Date, n: number): Date {
  return new Date(date.getFullYear(), date.getMonth() - n, 1)
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export type EnrollmentsTrendPoint = {
  monthKey: string
  monthLabel: string
  count: number
}

export type IncomeTrendPoint = {
  monthKey: string
  monthLabel: string
  totalCents: number
}

export type PopularCourseEntry = {
  courseId: string
  courseName: string
  count: number
}

export type RetentionData = {
  previousYearLabel: string | null
  currentYearLabel: string | null
  previousYearAthletes: number
  currentYearAthletes: number
  rematriculated: number
  ratePercent: number
}

export async function getEnrollmentsTrend(
  months = 12,
): Promise<EnrollmentsTrendPoint[]> {
  await requireAdmin()

  const now = new Date()
  const from = startOfMonth(subMonths(now, months - 1))
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  const enrollments = await prisma.courseEnrollment.findMany({
    where: {
      enrollmentDate: { gte: from, lt: to },
    },
    select: { enrollmentDate: true },
  })

  const buckets = new Map<string, EnrollmentsTrendPoint>()
  for (let i = 0; i < months; i++) {
    const cursor = startOfMonth(subMonths(now, months - 1 - i))
    const k = monthKey(cursor)
    buckets.set(k, {
      monthKey: k,
      monthLabel: monthLabel(cursor),
      count: 0,
    })
  }

  for (const en of enrollments) {
    const k = monthKey(en.enrollmentDate)
    const b = buckets.get(k)
    if (b) b.count += 1
  }

  return Array.from(buckets.values())
}

export async function getIncomeTrend(
  months = 12,
): Promise<IncomeTrendPoint[]> {
  await requireAdmin()

  const now = new Date()
  const from = startOfMonth(subMonths(now, months - 1))
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  const payments = await prisma.payment.findMany({
    where: {
      deletedAt: null,
      status: "PAID",
      paymentDate: { gte: from, lt: to },
    },
    select: { paymentDate: true, amountCents: true },
  })

  const buckets = new Map<string, IncomeTrendPoint>()
  for (let i = 0; i < months; i++) {
    const cursor = startOfMonth(subMonths(now, months - 1 - i))
    const k = monthKey(cursor)
    buckets.set(k, {
      monthKey: k,
      monthLabel: monthLabel(cursor),
      totalCents: 0,
    })
  }

  for (const p of payments) {
    const k = monthKey(p.paymentDate)
    const b = buckets.get(k)
    if (b) b.totalCents += p.amountCents
  }

  return Array.from(buckets.values())
}

export async function getPopularCourses(
  limit = 10,
): Promise<PopularCourseEntry[]> {
  await requireAdmin()

  const currentAY = await prisma.academicYear.findFirst({
    where: { isCurrent: true },
    select: { id: true },
  })

  if (!currentAY) return []

  const enrollments = await prisma.courseEnrollment.findMany({
    where: {
      academicYearId: currentAY.id,
      withdrawalDate: null,
    },
    select: {
      courseId: true,
      course: { select: { name: true } },
    },
  })

  const counts = new Map<string, PopularCourseEntry>()
  for (const en of enrollments) {
    const prev = counts.get(en.courseId)
    if (prev) {
      prev.count += 1
    } else {
      counts.set(en.courseId, {
        courseId: en.courseId,
        courseName: en.course.name,
        count: 1,
      })
    }
  }

  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

export async function getRetentionRate(): Promise<RetentionData> {
  await requireAdmin()

  const years = await prisma.academicYear.findMany({
    orderBy: { startDate: "desc" },
    take: 2,
    select: { id: true, label: true },
  })

  const current = years[0] ?? null
  const previous = years[1] ?? null

  if (!current || !previous) {
    return {
      previousYearLabel: previous?.label ?? null,
      currentYearLabel: current?.label ?? null,
      previousYearAthletes: 0,
      currentYearAthletes: 0,
      rematriculated: 0,
      ratePercent: 0,
    }
  }

  const [previousEnrollments, currentEnrollments] = await Promise.all([
    prisma.courseEnrollment.findMany({
      where: { academicYearId: previous.id },
      select: { athleteId: true },
    }),
    prisma.courseEnrollment.findMany({
      where: { academicYearId: current.id },
      select: { athleteId: true },
    }),
  ])

  const prevAthletes = new Set(previousEnrollments.map((e) => e.athleteId))
  const currAthletes = new Set(currentEnrollments.map((e) => e.athleteId))

  let rematriculated = 0
  for (const id of prevAthletes) {
    if (currAthletes.has(id)) rematriculated += 1
  }

  const ratePercent =
    prevAthletes.size > 0 ? (rematriculated / prevAthletes.size) * 100 : 0

  return {
    previousYearLabel: previous.label,
    currentYearLabel: current.label,
    previousYearAthletes: prevAthletes.size,
    currentYearAthletes: currAthletes.size,
    rematriculated,
    ratePercent,
  }
}
