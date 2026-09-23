import "server-only"

import { CURRENT_CARD_ORDER } from "@/lib/affiliations/card-status"
import {
  athleteScopeWhere,
  type PortalScope,
} from "@/lib/auth/portal-scope"
import { prisma } from "@/lib/prisma"
import {
  SCHEDULE_LINE_SELECT,
  compareScheduleLines,
  describeSchedule,
  paymentFeeTypeLabel,
} from "@/lib/payments/schedule-lines"
import { withActiveCourseOrStageScheduleFilter } from "@/lib/queries/active-schedule-filter"

// ─────────────────────────────────────────────────────────────────────────
// Tutte le query sono filtrate per ambito (athleteScopeWhere) per RLS
// applicativo (defense in depth oltre alle policy DB Supabase). I caller
// passano lo scope ottenuto da requirePortalAccess(): le figlie collegate
// per un genitore, sé stessa per un'allieva maggiorenne.
// ─────────────────────────────────────────────────────────────────────────

// Chi sta guardando: serve al saluto in dashboard. Stessa forma per
// entrambi, così chi la usa non deve sapere chi è entrato.
export async function getPortalProfile(scope: PortalScope) {
  if (scope.kind === "parent") {
    return prisma.parent.findUnique({
      where: { id: scope.parentId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      },
    })
  }

  return prisma.athlete.findUnique({
    where: { id: scope.athleteId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    },
  })
}

export async function getMyAthletes(scope: PortalScope) {
  // Le allieve dell'ambito: le figlie collegate, oppure sé stessa
  const athletes = await prisma.athlete.findMany({
    where: { deletedAt: null, ...athleteScopeWhere(scope) },
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
    orderBy: { firstName: "asc" },
  })

  // Parentela e "paga i contributi" descrivono il legame con il genitore che
  // sta guardando: per un'allieva che accede per sé non esistono.
  const relations =
    scope.kind === "parent" && athletes.length > 0
      ? await prisma.athleteParent.findMany({
          where: {
            parentId: scope.parentId,
            athleteId: { in: athletes.map((a) => a.id) },
          },
          select: {
            athleteId: true,
            relationship: true,
            isPrimaryPayer: true,
          },
        })
      : []
  const relationByAthlete = new Map(relations.map((r) => [r.athleteId, r]))

  return athletes.map((a) => {
    const relation = relationByAthlete.get(a.id) ?? null
    return {
      id: a.id,
      firstName: a.firstName,
      lastName: a.lastName,
      status: a.status,
      photoUrl: a.photoUrl,
      relationship: relation?.relationship ?? null,
      isPrimaryPayer: relation?.isPrimaryPayer ?? false,
      enrollments: a.enrollments.map((e) => ({
        id: e.id,
        courseId: e.course.id,
        courseName: e.course.name,
        courseType: e.course.type,
      })),
    }
  })
}

export type MyAthlete = Awaited<ReturnType<typeof getMyAthletes>>[number]

// Tessera dell'ente corrente per ogni allieva dell'ambito. È anche la
// copertura assicurativa: la famiglia ha diritto di vederla e di scaricarla.
// Il PDF contiene solo i dati dell'allieva, non quelli di chi paga, quindi
// fra genitori separati non fa passare niente che l'altro non abbia già.
export async function getMyAthleteCards(scope: PortalScope) {
  const cards = await prisma.affiliation.findMany({
    where: {
      deletedAt: null,
      athlete: { deletedAt: null, ...athleteScopeWhere(scope) },
    },
    orderBy: CURRENT_CARD_ORDER,
    select: {
      id: true,
      athleteId: true,
      entity: true,
      cardNumber: true,
      cardType: true,
      cardYear: true,
      expiryDate: true,
      filePath: true,
    },
  })

  // Solo la corrente per allieva: lo storico in area genitori non serve
  const byAthlete = new Map<string, (typeof cards)[number]>()
  for (const card of cards) {
    if (!byAthlete.has(card.athleteId)) byAthlete.set(card.athleteId, card)
  }
  return byAthlete
}

export type MyAthleteCard = NonNullable<
  ReturnType<Awaited<ReturnType<typeof getMyAthleteCards>>["get"]>
>

export async function getMyOpenSchedules(scope: PortalScope) {
  // Scadenze DUE/OVERDUE delle figlie del genitore (corsi, contributo di iscrizione,
  // stage, saggio, costumi)
  const schedules = await prisma.paymentSchedule.findMany({
    where: withActiveCourseOrStageScheduleFilter({
      status: { in: ["DUE", "OVERDUE"] },
      OR: [
        {
          courseEnrollment: {
            athlete: {
              deletedAt: null,
              ...athleteScopeWhere(scope),
            },
          },
        },
        {
          stageEnrollment: {
            athlete: {
              deletedAt: null,
              ...athleteScopeWhere(scope),
            },
          },
        },
        {
          showcaseParticipation: {
            athlete: {
              deletedAt: null,
              ...athleteScopeWhere(scope),
            },
          },
        },
        {
          costumeAssignment: {
            participation: {
              athlete: {
                deletedAt: null,
                ...athleteScopeWhere(scope),
              },
            },
          },
        },
        {
          athlete: {
            deletedAt: null,
            ...athleteScopeWhere(scope),
          },
        },
      ],
    }),
    select: {
      id: true,
      feeType: true,
      dueDate: true,
      amountCents: true,
      status: true,
      notes: true,
      // Serve alla dicitura del contributo di iscrizione ("… 2026/2027")
      academicYear: { select: { label: true } },
      // Contributo di iscrizione: collegato direttamente all'allieva
      athlete: {
        select: { id: true, firstName: true, lastName: true },
      },
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
      stageEnrollment: {
        select: {
          athleteId: true,
          athlete: {
            select: { id: true, firstName: true, lastName: true },
          },
          stage: {
            select: { id: true, title: true },
          },
        },
      },
      showcaseParticipation: {
        select: {
          athleteId: true,
          athlete: {
            select: { id: true, firstName: true, lastName: true },
          },
          showcase: {
            select: { id: true, title: true },
          },
        },
      },
      costumeAssignment: {
        select: {
          size: true,
          costume: { select: { id: true, name: true } },
          participation: {
            select: {
              athleteId: true,
              athlete: {
                select: { id: true, firstName: true, lastName: true },
              },
              showcase: { select: { id: true, title: true } },
            },
          },
        },
      },
    },
    orderBy: { dueDate: "asc" },
  })

  return schedules.map((s) => {
    const courseAth = s.courseEnrollment?.athlete
    const stageAth = s.stageEnrollment?.athlete
    const showcaseAth = s.showcaseParticipation?.athlete
    const costumeAth = s.costumeAssignment?.participation.athlete
    const athlete =
      courseAth ?? stageAth ?? showcaseAth ?? costumeAth ?? s.athlete
    return {
      id: s.id,
      feeType: s.feeType,
      dueDate: s.dueDate,
      amountCents: s.amountCents,
      status: s.status,
      notes: s.notes,
      academicYearLabel: s.academicYear.label,
      athleteId: athlete?.id ?? "",
      athleteName: athlete
        ? `${athlete.firstName} ${athlete.lastName}`
        : "—",
      courseName: s.courseEnrollment?.course.name ?? null,
      stageName: s.stageEnrollment?.stage.title ?? null,
      showcaseName:
        s.showcaseParticipation?.showcase.title ??
        s.costumeAssignment?.participation.showcase.title ??
        null,
      costumeName: s.costumeAssignment?.costume.name ?? null,
      costumeSize: s.costumeAssignment?.size ?? null,
    }
  })
}

export type MyOpenSchedule = Awaited<
  ReturnType<typeof getMyOpenSchedules>
>[number]

export async function getMyPayments(scope: PortalScope) {
  // Pagamenti delle figlie (cross-allieve, ordinati cronologici desc).
  // Anche gli stornati: restano nello storico con il loro stato.
  const payments = await prisma.payment.findMany({
    where: {
      status: { in: ["PAID", "REVERSED"] },
      deletedAt: null,
      athlete: {
        ...athleteScopeWhere(scope),
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
      status: true,
      receipt: {
        select: { id: true, receiptNumber: true, status: true },
      },
      // Scadenze coperte: più d'una → righe nello storico
      paymentSchedules: { select: SCHEDULE_LINE_SELECT },
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
    status: p.status,
    athleteId: p.athlete.id,
    athleteName: `${p.athlete.firstName} ${p.athlete.lastName}`,
    athleteArchived: p.athlete.deletedAt !== null,
    // "Contributo di iscrizione + Contributo mensile" se copre più scadenze
    feeLabel: paymentFeeTypeLabel(p),
    lines:
      p.paymentSchedules.length >= 2
        ? [...p.paymentSchedules].sort(compareScheduleLines).map((s) => ({
            description: describeSchedule(s),
            amountCents: s.amountCents,
          }))
        : [],
    // Scaricabile solo una ricevuta emessa dall'admin e ancora valida
    receipt:
      p.status === "PAID" && p.receipt?.status === "VALID"
        ? { id: p.receipt.id, receiptNumber: p.receipt.receiptNumber }
        : null,
  }))
}

export type MyPayment = Awaited<ReturnType<typeof getMyPayments>>[number]

export async function getMyAthleteSchedules(scope: PortalScope) {
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
              ...athleteScopeWhere(scope),
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

export type AttendanceStats = {
  presentCount: number
  absentCount: number
  justifiedCount: number
  totalLessons: number
  attendanceRate: number
}

// Stats presenze per allieva nell'AA corrente. Mappa athleteId → stats.
// Allieve senza alcuna presenza registrata NON appaiono nella mappa
// (caller mostra empty state). Sprint 4.A.1.
export async function getMyAttendanceStats(scope: PortalScope): Promise<{
  byAthlete: Map<string, AttendanceStats>
  academicYearLabel: string | null
}> {
  // Risolvi AA corrente. isCurrent boolean = source of truth.
  const currentYear = await prisma.academicYear.findFirst({
    where: { isCurrent: true },
    select: { id: true, label: true },
  })

  if (!currentYear) {
    return { byAthlete: new Map(), academicYearLabel: null }
  }

  const grouped = await prisma.attendance.groupBy({
    by: ["athleteId", "status"],
    where: {
      athlete: {
        deletedAt: null,
        ...athleteScopeWhere(scope),
      },
      lesson: { academicYearId: currentYear.id },
    },
    _count: { _all: true },
  })

  const byAthlete = new Map<string, AttendanceStats>()
  for (const row of grouped) {
    const cur =
      byAthlete.get(row.athleteId) ??
      ({
        presentCount: 0,
        absentCount: 0,
        justifiedCount: 0,
        totalLessons: 0,
        attendanceRate: 0,
      } satisfies AttendanceStats)

    if (row.status === "PRESENT") cur.presentCount += row._count._all
    else if (row.status === "ABSENT") cur.absentCount += row._count._all
    else if (row.status === "JUSTIFIED") cur.justifiedCount += row._count._all

    cur.totalLessons =
      cur.presentCount + cur.absentCount + cur.justifiedCount
    cur.attendanceRate =
      cur.totalLessons > 0
        ? Math.round((cur.presentCount / cur.totalLessons) * 100)
        : 0

    byAthlete.set(row.athleteId, cur)
  }

  return { byAthlete, academicYearLabel: currentYear.label }
}
