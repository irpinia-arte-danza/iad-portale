import "server-only"

import { prisma } from "@/lib/prisma"

// ─────────────────────────────────────────────────────────────────────────
// Tutte le query sono filtrate per parentId per RLS applicativo (defense
// in depth oltre alle policy DB Supabase). I caller passano il parentId
// ottenuto da requireParent().
// ─────────────────────────────────────────────────────────────────────────

export async function getParentProfile(parentId: string) {
  return prisma.parent.findUnique({
    where: { id: parentId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    },
  })
}

export async function getMyAthletes(parentId: string) {
  // Allieve attive (non eliminate) collegate al genitore via AthleteParent
  const relations = await prisma.athleteParent.findMany({
    where: {
      parentId,
      athlete: { deletedAt: null },
    },
    select: {
      relationship: true,
      isPrimaryPayer: true,
      athlete: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          status: true,
          photoUrl: true,
          enrollments: {
            where: {
              withdrawalDate: null,
              academicYear: { isCurrent: true },
            },
            select: {
              id: true,
              course: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { athlete: { firstName: "asc" } },
  })

  return relations.map((r) => ({
    id: r.athlete.id,
    firstName: r.athlete.firstName,
    lastName: r.athlete.lastName,
    status: r.athlete.status,
    photoUrl: r.athlete.photoUrl,
    relationship: r.relationship,
    isPrimaryPayer: r.isPrimaryPayer,
    enrollments: r.athlete.enrollments.map((e) => ({
      id: e.id,
      courseId: e.course.id,
      courseName: e.course.name,
      courseType: e.course.type,
    })),
  }))
}

export type MyAthlete = Awaited<ReturnType<typeof getMyAthletes>>[number]

export async function getMyOpenSchedules(parentId: string) {
  // Scadenze DUE/OVERDUE delle figlie del genitore
  const schedules = await prisma.paymentSchedule.findMany({
    where: {
      status: { in: ["DUE", "OVERDUE"] },
      courseEnrollment: {
        athlete: {
          deletedAt: null,
          parentRelations: { some: { parentId } },
        },
      },
    },
    select: {
      id: true,
      feeType: true,
      dueDate: true,
      amountCents: true,
      status: true,
      courseEnrollment: {
        select: {
          athleteId: true,
          athlete: {
            select: { id: true, firstName: true, lastName: true },
          },
          course: {
            select: { id: true, name: true },
          },
        },
      },
    },
    orderBy: { dueDate: "asc" },
  })

  return schedules.map((s) => ({
    id: s.id,
    feeType: s.feeType,
    dueDate: s.dueDate,
    amountCents: s.amountCents,
    status: s.status,
    athleteId: s.courseEnrollment.athlete.id,
    athleteName: `${s.courseEnrollment.athlete.firstName} ${s.courseEnrollment.athlete.lastName}`,
    courseName: s.courseEnrollment.course.name,
  }))
}

export type MyOpenSchedule = Awaited<
  ReturnType<typeof getMyOpenSchedules>
>[number]

export async function getMyPayments(parentId: string) {
  // Pagamenti PAID delle figlie (cross-allieve, ordinati cronologici desc)
  const payments = await prisma.payment.findMany({
    where: {
      status: "PAID",
      deletedAt: null,
      athlete: {
        parentRelations: { some: { parentId } },
      },
    },
    select: {
      id: true,
      feeType: true,
      amountCents: true,
      method: true,
      paymentDate: true,
      periodStart: true,
      periodEnd: true,
      athlete: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          deletedAt: true,
        },
      },
      receipt: {
        select: { id: true, receiptNumber: true },
      },
    },
    orderBy: { paymentDate: "desc" },
  })

  return payments.map((p) => ({
    id: p.id,
    feeType: p.feeType,
    amountCents: p.amountCents,
    method: p.method,
    paymentDate: p.paymentDate,
    periodStart: p.periodStart,
    periodEnd: p.periodEnd,
    athleteId: p.athlete.id,
    athleteName: `${p.athlete.firstName} ${p.athlete.lastName}`,
    athleteArchived: p.athlete.deletedAt !== null,
    receiptNumber: p.receipt?.receiptNumber ?? null,
  }))
}

export type MyPayment = Awaited<ReturnType<typeof getMyPayments>>[number]

export async function getMyAthleteSchedules(parentId: string) {
  // Orari corsi delle figlie del genitore (validi alla data corrente)
  const today = new Date()
  const schedules = await prisma.courseSchedule.findMany({
    where: {
      validFrom: { lte: today },
      OR: [{ validTo: null }, { validTo: { gte: today } }],
      course: {
        enrollments: {
          some: {
            withdrawalDate: null,
            academicYear: { isCurrent: true },
            athlete: {
              deletedAt: null,
              parentRelations: { some: { parentId } },
            },
          },
        },
      },
    },
    select: {
      id: true,
      dayOfWeek: true,
      startTime: true,
      endTime: true,
      location: true,
      course: { select: { id: true, name: true } },
    },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  })

  return schedules.map((s) => ({
    id: s.id,
    dayOfWeek: s.dayOfWeek,
    startTime: s.startTime,
    endTime: s.endTime,
    location: s.location,
    courseId: s.course.id,
    courseName: s.course.name,
  }))
}

export type MyAthleteSchedule = Awaited<
  ReturnType<typeof getMyAthleteSchedules>
>[number]

export async function getGeneralCourseSchedules() {
  // Orario settimanale generale ASD: tutti i corsi attivi nell'anno
  // accademico corrente (per genitori che vogliono vedere altri corsi)
  const today = new Date()
  const schedules = await prisma.courseSchedule.findMany({
    where: {
      validFrom: { lte: today },
      OR: [{ validTo: null }, { validTo: { gte: today } }],
      course: {
        enrollments: {
          some: {
            withdrawalDate: null,
            academicYear: { isCurrent: true },
          },
        },
      },
    },
    select: {
      id: true,
      dayOfWeek: true,
      startTime: true,
      endTime: true,
      location: true,
      course: { select: { id: true, name: true, type: true } },
    },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  })

  return schedules.map((s) => ({
    id: s.id,
    dayOfWeek: s.dayOfWeek,
    startTime: s.startTime,
    endTime: s.endTime,
    location: s.location,
    courseId: s.course.id,
    courseName: s.course.name,
    courseType: s.course.type,
  }))
}

export type GeneralCourseSchedule = Awaited<
  ReturnType<typeof getGeneralCourseSchedules>
>[number]

export async function getBrandIban() {
  const brand = await prisma.brandSettings.findUnique({
    where: { id: 1 },
    select: { asdIban: true, asdName: true, asdEmail: true },
  })
  return brand
}
