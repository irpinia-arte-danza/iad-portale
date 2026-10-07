import "server-only"

import { CURRENT_CARD_ORDER } from "@/lib/affiliations/card-status"
import { CURRENT_CERTIFICATE_ORDER } from "@/lib/medical-certificates/certificate-status"
import {
  athleteScopeWhere,
  type PortalScope,
} from "@/lib/auth/portal-scope"
import {
  canSeePersonalData,
  canSeeReceipt,
  personalDataScopeWhere,
} from "@/lib/auth/portal-visibility"
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
//
// I dati personali (presenze, tessera, orari suoi) passano da un filtro più
// stretto, personalDataScopeWhere: di una figlia maggiorenne il genitore
// vede solo le cose di pagamento. Le ricevute le vede chi ne è intestatario
// (canSeeReceipt). Regole in src/lib/auth/portal-visibility.ts.
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
      dateOfBirth: true,
      enrollments: {
        where: {
          withdrawalDate: null,
          deletedAt: null,
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
    // Di una figlia maggiorenne restano nome e cose di pagamento: la foto
    // no, e la pagina non mostra presenze né tessera
    const personalDataVisible = canSeePersonalData(scope, a)
    return {
      id: a.id,
      firstName: a.firstName,
      lastName: a.lastName,
      status: a.status,
      photoUrl: personalDataVisible ? a.photoUrl : null,
      personalDataVisible,
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

// Tessera dell'ente corrente per ogni allieva di cui si vedono i dati
// personali. È anche la copertura assicurativa: la famiglia di una minorenne
// ha diritto di vederla e di scaricarla. Il PDF contiene solo i dati
// dell'allieva, non quelli di chi paga, quindi fra genitori separati non fa
// passare niente che l'altro non abbia già. Di una maggiorenne la vede lei.
export async function getMyAthleteCards(scope: PortalScope) {
  const cards = await prisma.affiliation.findMany({
    where: {
      deletedAt: null,
      athlete: { deletedAt: null, ...personalDataScopeWhere(scope) },
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

const ATHLETE_NAME_SELECT = {
  select: { id: true, firstName: true, lastName: true },
} as const

export async function getMyOpenSchedules(scope: PortalScope) {
  // Scadenze DUE/OVERDUE delle allieve dell'ambito (corsi, contributo di
  // iscrizione, stage, saggio, costumi). La select è quella di
  // schedule-lines più il nome dell'allieva: così la dicitura è la stessa
  // della ricevuta (describeSchedule) e la causale del bonifico si compone
  // dagli stessi dati.
  const athleteScope = { deletedAt: null, ...athleteScopeWhere(scope) }
  const schedules = await prisma.paymentSchedule.findMany({
    where: withActiveCourseOrStageScheduleFilter({
      status: { in: ["DUE", "OVERDUE"] },
      OR: [
        { courseEnrollment: { athlete: athleteScope } },
        { stageEnrollment: { athlete: athleteScope } },
        { showcaseParticipation: { athlete: athleteScope } },
        { costumeAssignment: { participation: { athlete: athleteScope } } },
        { athlete: athleteScope },
      ],
    }),
    select: {
      ...SCHEDULE_LINE_SELECT,
      athlete: ATHLETE_NAME_SELECT,
      courseEnrollment: {
        select: {
          ...SCHEDULE_LINE_SELECT.courseEnrollment.select,
          athlete: ATHLETE_NAME_SELECT,
        },
      },
      stageEnrollment: {
        select: {
          ...SCHEDULE_LINE_SELECT.stageEnrollment.select,
          athlete: ATHLETE_NAME_SELECT,
        },
      },
      showcaseParticipation: {
        select: {
          ...SCHEDULE_LINE_SELECT.showcaseParticipation.select,
          athlete: ATHLETE_NAME_SELECT,
        },
      },
      costumeAssignment: {
        select: {
          ...SCHEDULE_LINE_SELECT.costumeAssignment.select,
          participation: {
            select: { athleteId: true, athlete: ATHLETE_NAME_SELECT },
          },
        },
      },
    },
    orderBy: { dueDate: "asc" },
  })

  return schedules.map((s) => {
    const athlete =
      s.courseEnrollment?.athlete ??
      s.stageEnrollment?.athlete ??
      s.showcaseParticipation?.athlete ??
      s.costumeAssignment?.participation.athlete ??
      s.athlete
    return {
      id: s.id,
      feeType: s.feeType,
      dueDate: s.dueDate,
      amountCents: s.amountCents,
      status: s.status,
      // «Contributo mensile di ottobre 2026», «Contributo di iscrizione 2026/2027»…
      description: describeSchedule(s),
      athleteId: athlete?.id ?? "",
      athleteName: athlete ? `${athlete.firstName} ${athlete.lastName}` : "—",
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
        select: {
          id: true,
          receiptNumber: true,
          status: true,
          payerId: true,
          issueDate: true,
        },
      },
      // Scadenze coperte: più d'una → righe nello storico
      paymentSchedules: { select: SCHEDULE_LINE_SELECT },
    },
    orderBy: { paymentDate: "desc" },
  })

  return payments.map((p) => {
    // Scaricabile solo una ricevuta emessa dall'admin e ancora valida
    const validReceipt =
      p.status === "PAID" && p.receipt?.status === "VALID" ? p.receipt : null
    const mine = validReceipt !== null && canSeeReceipt(scope, validReceipt)
    return {
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
      // … e intestata a chi guarda: l'altro genitore vede il pagamento, non
      // la ricevuta
      receipt: mine
        ? {
            id: validReceipt.id,
            receiptNumber: validReceipt.receiptNumber,
            issueDate: validReceipt.issueDate,
          }
        : null,
      // Emessa ma intestata a un'altra persona: si dice che c'è, non a chi
      receiptHeldByOther: validReceipt !== null && !mine,
    }
  })
}

export type MyPayment = Awaited<ReturnType<typeof getMyPayments>>[number]

export async function getMyAthleteSchedules(scope: PortalScope) {
  // Orari dei corsi delle allieve di cui si vedono i dati personali (validi
  // alla data corrente). L'orario generale resta per tutti.
  const today = new Date()
  const schedules = await prisma.courseSchedule.findMany({
    where: {
      validFrom: { lte: today },
      OR: [{ validTo: null }, { validTo: { gte: today } }],
      course: {
        enrollments: {
          some: {
            withdrawalDate: null,
            deletedAt: null,
            academicYear: { isCurrent: true },
            athlete: {
              deletedAt: null,
              ...personalDataScopeWhere(scope),
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
            deletedAt: null,
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

// Dati per il bonifico mostrati in dashboard. L'intestatario è un campo a
// parte: se vuoto, il nome dell'ASD.
export async function getBrandPaymentInfo() {
  const brand = await prisma.brandSettings.findUnique({
    where: { id: 1 },
    select: { asdIban: true, asdName: true, asdEmail: true, bankAccountHolder: true },
  })
  if (!brand) return null
  return {
    iban: brand.asdIban,
    asdName: brand.asdName,
    asdEmail: brand.asdEmail,
    accountHolder: brand.bankAccountHolder?.trim() || brand.asdName,
  }
}

// Certificato medico corrente per ogni allieva di cui si vedono i dati
// personali (figlia minorenne, o sé stessa): è un dato sanitario, e di una
// figlia maggiorenne il genitore non lo vede. Lo stato (valido, in
// scadenza, scaduto, mancante) lo ricava chi legge con classifyCert.
export async function getMyAthleteCertificates(scope: PortalScope) {
  const certificates = await prisma.medicalCertificate.findMany({
    where: {
      deletedAt: null,
      athlete: { deletedAt: null, ...personalDataScopeWhere(scope) },
    },
    orderBy: CURRENT_CERTIFICATE_ORDER,
    select: { id: true, athleteId: true, expiryDate: true },
  })
  // Solo il corrente per allieva (lo stesso ordine delle pagine admin)
  const byAthlete = new Map<string, (typeof certificates)[number]>()
  for (const certificate of certificates) {
    if (!byAthlete.has(certificate.athleteId)) {
      byAthlete.set(certificate.athleteId, certificate)
    }
  }
  return byAthlete
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
// (caller mostra empty state). Sprint 4.A.1. Solo le allieve di cui si
// vedono i dati personali: di una figlia maggiorenne niente.
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
        ...personalDataScopeWhere(scope),
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
