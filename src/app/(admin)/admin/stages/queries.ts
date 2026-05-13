import "server-only"

import { prisma } from "@/lib/prisma"

export type StageListItem = {
  id: string
  title: string
  date: Date
  startTime: string
  endTime: string
  location: string | null
  capacity: number
  feeCents: number
  registrationOpen: boolean
  registrationDeadline: Date | null
  enrolledCount: number
  deletedAt: Date | null
  academicYear: { id: string; label: string }
}

export async function listStages(options?: {
  academicYearId?: string
  includeDeleted?: boolean
}): Promise<StageListItem[]> {
  const stages = await prisma.stage.findMany({
    where: {
      ...(options?.includeDeleted ? {} : { deletedAt: null }),
      ...(options?.academicYearId
        ? { academicYearId: options.academicYearId }
        : {}),
    },
    orderBy: { date: "desc" },
    include: {
      academicYear: { select: { id: true, label: true } },
      _count: { select: { enrollments: true } },
    },
  })

  return stages.map((s) => ({
    id: s.id,
    title: s.title,
    date: s.date,
    startTime: s.startTime,
    endTime: s.endTime,
    location: s.location,
    capacity: s.capacity,
    feeCents: s.feeCents,
    registrationOpen: s.registrationOpen,
    registrationDeadline: s.registrationDeadline,
    enrolledCount: s._count.enrollments,
    deletedAt: s.deletedAt,
    academicYear: s.academicYear,
  }))
}

export async function getStageById(id: string) {
  return prisma.stage.findUnique({
    where: { id },
    include: {
      academicYear: { select: { id: true, label: true } },
      enrollments: {
        include: {
          athlete: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              deletedAt: true,
              parentRelations: {
                where: { parent: { deletedAt: null } },
                orderBy: [
                  { isPrimaryPayer: "desc" },
                  { isPrimaryContact: "desc" },
                ],
                take: 1,
                select: {
                  parent: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      email: true,
                      phone: true,
                    },
                  },
                },
              },
            },
          },
          paymentSchedule: {
            select: {
              id: true,
              status: true,
              dueDate: true,
              amountCents: true,
            },
          },
          payment: {
            select: {
              id: true,
              paymentDate: true,
              method: true,
              amountCents: true,
              status: true,
            },
          },
        },
        orderBy: [
          { athlete: { lastName: "asc" } },
          { athlete: { firstName: "asc" } },
        ],
      },
    },
  })
}

export type StageWithDetails = NonNullable<
  Awaited<ReturnType<typeof getStageById>>
>

export async function listStageEnrollableAthletes(stageId: string) {
  // Allieve attive (non eliminate) non ancora iscritte a questo stage
  const enrolled = await prisma.stageEnrollment.findMany({
    where: { stageId },
    select: { athleteId: true },
  })
  const enrolledIds = new Set(enrolled.map((e) => e.athleteId))

  const athletes = await prisma.athlete.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  })

  return athletes.filter((a) => !enrolledIds.has(a.id))
}

export async function getStageEmailLogs(stageId: string) {
  // Email logs collegate alle allieve iscritte allo stage (template stage-invite)
  const enrollments = await prisma.stageEnrollment.findMany({
    where: { stageId },
    select: { athleteId: true },
  })
  const athleteIds = enrollments.map((e) => e.athleteId)

  // Email sent to invite-template per atleti i cui parent sono stati invitati
  // o per qualsiasi allieva attiva (anche se non ancora iscritta) — vediamo tutto.
  const stage = await prisma.stage.findUnique({
    where: { id: stageId },
    select: { id: true, createdAt: true },
  })
  if (!stage) return []

  const logs = await prisma.emailLog.findMany({
    where: {
      templateSlug: "stage-invite",
      sentAt: { gte: stage.createdAt },
      OR: [
        athleteIds.length > 0 ? { athleteId: { in: athleteIds } } : undefined,
        { athleteId: { not: null } },
      ].filter(Boolean) as object[],
    },
    select: {
      id: true,
      recipientEmail: true,
      recipientName: true,
      subject: true,
      status: true,
      sentAt: true,
      athleteId: true,
    },
    orderBy: { sentAt: "desc" },
    take: 200,
  })

  return logs
}
