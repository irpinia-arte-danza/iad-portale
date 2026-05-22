import "server-only"

import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"

export async function getCurrentShowcase() {
  const ay = await prisma.academicYear.findFirst({
    where: { isCurrent: true },
    select: { id: true, label: true },
  })
  if (!ay) return { academicYear: null as null, showcase: null }

  const showcase = await prisma.showcase.findUnique({
    where: { academicYearId: ay.id },
    select: {
      id: true,
      title: true,
      date: true,
      deletedAt: true,
    },
  })

  return {
    academicYear: ay,
    showcase: showcase && showcase.deletedAt === null ? showcase : null,
  }
}

const showcaseDetailArgs = Prisma.validator<Prisma.ShowcaseDefaultArgs>()({
  select: {
    id: true,
    title: true,
    description: true,
    date: true,
    location: true,
    rehearsalDate: true,
    firstInstallmentCents: true,
    secondInstallmentCents: true,
    firstDeadline: true,
    secondDeadline: true,
    deletedAt: true,
    academicYear: { select: { id: true, label: true } },
    participations: {
      select: {
        id: true,
        confirmed: true,
        confirmedAt: true,
        paymentMode: true,
        choreography: true,
        notes: true,
        athlete: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            deletedAt: true,
            enrollments: {
              where: {
                withdrawalDate: null,
                course: { deletedAt: null },
                academicYear: { isCurrent: true },
              },
              select: {
                course: { select: { id: true, name: true } },
              },
              take: 5,
            },
          },
        },
        paymentSchedules: {
          select: {
            id: true,
            feeType: true,
            dueDate: true,
            amountCents: true,
            status: true,
            notes: true,
            payment: {
              select: {
                id: true,
                paymentDate: true,
                amountCents: true,
                method: true,
                status: true,
              },
            },
          },
          orderBy: { dueDate: "asc" },
        },
      },
      orderBy: [
        { athlete: { lastName: "asc" } },
        { athlete: { firstName: "asc" } },
      ],
    },
  },
})

export type ShowcaseWithDetails = Prisma.ShowcaseGetPayload<
  typeof showcaseDetailArgs
>

export async function getShowcaseById(
  id: string,
): Promise<ShowcaseWithDetails | null> {
  return prisma.showcase.findUnique({
    where: { id },
    ...showcaseDetailArgs,
  })
}

export async function listShowcaseEnrollableAthletes(showcaseId: string) {
  // Allieve attive (non soft-deleted) non già partecipanti
  const showcase = await prisma.showcase.findUnique({
    where: { id: showcaseId },
    select: { academicYearId: true },
  })
  if (!showcase) return []

  const existing = await prisma.showcaseParticipation.findMany({
    where: { showcaseId },
    select: { athleteId: true },
  })
  const existingIds = new Set(existing.map((p) => p.athleteId))

  const athletes = await prisma.athlete.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      enrollments: {
        where: {
          academicYearId: showcase.academicYearId,
          withdrawalDate: null,
          course: { deletedAt: null },
        },
        select: { course: { select: { id: true, name: true } } },
        take: 3,
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  })

  return athletes
    .filter((a) => !existingIds.has(a.id))
    .map((a) => ({
      id: a.id,
      firstName: a.firstName,
      lastName: a.lastName,
      enrolledInCurrentAY: a.enrollments.length > 0,
      courses: a.enrollments.map((e) => e.course.name),
    }))
}
