import "server-only"

import { prisma } from "@/lib/prisma"

function startOfUTCToday(): Date {
  const now = new Date()
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  )
}

export type ParentStageItem = {
  id: string
  title: string
  description: string | null
  date: Date
  startTime: string
  endTime: string
  location: string | null
  feeCents: number
  capacity: number
  enrolledCount: number
  registrationDeadline: Date | null
  registrationOpen: boolean
  myAthletes: {
    id: string
    firstName: string
    lastName: string
    alreadyEnrolled: boolean
    enrollmentId: string | null
    paid: boolean
  }[]
}

export async function listStagesForParent(
  parentId: string,
): Promise<ParentStageItem[]> {
  const today = startOfUTCToday()

  // 1) Stage in AA corrente, futuri, non cancellati
  const stages = await prisma.stage.findMany({
    where: {
      deletedAt: null,
      academicYear: { isCurrent: true },
      date: { gte: today },
    },
    orderBy: { date: "asc" },
    include: {
      _count: { select: { enrollments: true } },
    },
  })

  if (stages.length === 0) return []

  // 2) Allieve attive del genitore
  const myAthletes = await prisma.athleteParent.findMany({
    where: {
      parentId,
      athlete: { deletedAt: null },
    },
    select: {
      athlete: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  })
  const athletes = myAthletes.map((r) => r.athlete)
  if (athletes.length === 0) return []

  // 3) Iscrizioni esistenti per quegli stage/atleti
  const stageIds = stages.map((s) => s.id)
  const athleteIds = athletes.map((a) => a.id)
  const existingEnrollments = await prisma.stageEnrollment.findMany({
    where: {
      stageId: { in: stageIds },
      athleteId: { in: athleteIds },
    },
    select: {
      id: true,
      stageId: true,
      athleteId: true,
      paid: true,
    },
  })
  const enrolledMap = new Map<string, (typeof existingEnrollments)[number]>()
  for (const e of existingEnrollments) {
    enrolledMap.set(`${e.stageId}::${e.athleteId}`, e)
  }

  return stages
    .map((s) => {
      const myAthletesForStage = athletes.map((a) => {
        const enr = enrolledMap.get(`${s.id}::${a.id}`) ?? null
        return {
          id: a.id,
          firstName: a.firstName,
          lastName: a.lastName,
          alreadyEnrolled: enr !== null,
          enrollmentId: enr?.id ?? null,
          paid: enr?.paid ?? false,
        }
      })

      return {
        id: s.id,
        title: s.title,
        description: s.description,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        location: s.location,
        feeCents: s.feeCents,
        capacity: s.capacity,
        enrolledCount: s._count.enrollments,
        registrationDeadline: s.registrationDeadline,
        registrationOpen: s.registrationOpen,
        myAthletes: myAthletesForStage,
      }
    })
    .filter((s) => {
      // Mostra solo stage con almeno una figlia non già iscritta E iscrizioni aperte
      const hasEnrollable = s.myAthletes.some((a) => !a.alreadyEnrolled)
      const deadlineOk =
        !s.registrationDeadline || s.registrationDeadline >= today
      return s.registrationOpen && hasEnrollable && deadlineOk
    })
}

export async function countOpenStagesForParent(
  parentId: string,
): Promise<number> {
  const stages = await listStagesForParent(parentId)
  return stages.length
}
