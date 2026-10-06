import {
  AuditAction,
  PaymentStatus,
  Prisma,
  ScheduleStatus,
  type FeeType,
  type PaymentMethod,
} from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"
import { withActiveCourseOrAssociationScheduleFilter } from "@/lib/queries/active-schedule-filter"
import {
  summarizeReminders,
  type ReminderSummary,
  type ReminderTrace,
} from "@/lib/scadenze/reminder-trace"
import { isMinorAt } from "@/lib/utils/age"
import { todayDateOnly } from "@/lib/utils/date-only"

export type ScadenzeStatoFilter =
  | "DEFAULT"
  | "IN_RITARDO"
  | "IN_SCADENZA_7GG"
  | "TUTTE"

export type ScadenzeSort = "dueDate_asc" | "dueDate_desc" | "amount_desc"

export type ScadenzeFilter = {
  stato: ScadenzeStatoFilter
  courseId?: string
  academicYearId?: string
  search?: string
  sortBy?: ScadenzeSort
}

export type ScadenzaWithDetails = {
  id: string
  dueDate: Date
  amountCents: number
  status: ScheduleStatus
  feeType: FeeType
  // Causale della scadenza (es. "Quota associativa 2026/2027")
  notes: string | null
  giorniRitardo: number // > 0 se scaduta, 0 = oggi, < 0 = in scadenza futura

  athlete: {
    id: string
    firstName: string
    lastName: string
  }
  // Chi riceve i solleciti: il genitore di riferimento, oppure l'allieva
  // stessa quando non ha genitori collegati (corso adulti)
  contact: {
    name: string
    email: string | null
    phone: string | null
    isAthlete: boolean
    // null quando il destinatario è l'allieva: è la chiave con cui il
    // sollecito di gruppo mette insieme le rate di una famiglia
    parentId: string | null
  } | null
  // Serve al dialog "Incassa" per spuntare la rata giusta
  courseEnrollmentId: string | null
  // Ultimo metodo usato dalla famiglia: precompila l'incasso
  lastMethod: PaymentMethod | null
  // null per la quota associativa, che non è legata a un corso
  course: {
    id: string
    name: string
    monthlyFeeCents: number
  } | null
  academicYear: {
    id: string
    label: string
  }

  // Email partite più chat di WhatsApp aperte dal gestionale
  reminders: ReminderSummary
}

// Allieva e genitore di riferimento: dall'iscrizione al corso per le mensili,
// direttamente dall'allieva per la quota associativa.
const SCHEDULE_ATHLETE_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  // Contatto quando non ha genitori collegati (corso adulti)
  email: true,
  // Serve al limite dei 18 anni per il ripiego sull allieva
  dateOfBirth: true,
  phone: true,
  parentRelations: {
    where: { parent: { deletedAt: null } },
    orderBy: [{ isPrimaryPayer: "desc" }, { isPrimaryContact: "desc" }],
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
} satisfies Prisma.AthleteSelect

function athleteSearch(q: string): Prisma.AthleteWhereInput {
  return {
    OR: [
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      {
        parentRelations: {
          some: {
            parent: {
              OR: [
                { firstName: { contains: q, mode: "insensitive" } },
                { lastName: { contains: q, mode: "insensitive" } },
              ],
            },
          },
        },
      },
    ],
  }
}

/**
 * Il filtro dell'elenco Scadenze, esportato perché i riquadri "Da fare" in
 * dashboard contino esattamente le righe che l'elenco mostra: un predicato
 * solo, non due query scritte a parte che col tempo divergono.
 */
export function scadenzeWhere(
  filter: ScadenzeFilter,
): Prisma.PaymentScheduleWhereInput {
  // todayDateOnly e non il giorno UTC: fra mezzanotte e le 2 ora di Roma il
  // giorno UTC è ancora quello prima, e una rata in scadenza oggi finirebbe
  // fra quelle in ritardo
  const today = todayDateOnly()
  const in7days = new Date(today)
  in7days.setUTCDate(in7days.getUTCDate() + 7)

  const base: Prisma.PaymentScheduleWhereInput = {
    status: ScheduleStatus.DUE,
  }

  switch (filter.stato) {
    case "IN_RITARDO":
      base.dueDate = { lt: today }
      break
    case "IN_SCADENZA_7GG":
      base.dueDate = { gte: today, lte: in7days }
      break
    case "DEFAULT":
      base.dueDate = { lte: in7days }
      break
    case "TUTTE":
      break
  }

  if (filter.academicYearId) {
    base.academicYearId = filter.academicYearId
  }

  const conditions: Prisma.PaymentScheduleWhereInput[] = [base]

  // Filtro per corso: la quota associativa non ha corso e resta esclusa
  if (filter.courseId) {
    conditions.push({ courseEnrollment: { courseId: filter.courseId } })
  }

  if (filter.search && filter.search.trim().length > 0) {
    const athlete = athleteSearch(filter.search.trim())
    conditions.push({ OR: [{ courseEnrollment: { athlete } }, { athlete }] })
  }

  return withActiveCourseOrAssociationScheduleFilter({ AND: conditions })
}

function buildOrderBy(
  sort: ScadenzeSort = "dueDate_asc",
): Prisma.PaymentScheduleOrderByWithRelationInput {
  switch (sort) {
    case "dueDate_desc":
      return { dueDate: "desc" }
    case "amount_desc":
      return { amountCents: "desc" }
    default:
      return { dueDate: "asc" }
  }
}

export async function getScadenze(
  filter: ScadenzeFilter,
): Promise<ScadenzaWithDetails[]> {
  await requireAdmin()

  const where = scadenzeWhere(filter)
  const orderBy = buildOrderBy(filter.sortBy)

  const schedules = await prisma.paymentSchedule.findMany({
    where,
    orderBy,
    include: {
      academicYear: { select: { id: true, label: true } },
      courseEnrollment: {
        select: {
          id: true,
          // monthlyFeeCents alimenta il tasto "Riporta a …" del dialog importo
          course: {
            select: { id: true, name: true, monthlyFeeCents: true },
          },
          athlete: { select: SCHEDULE_ATHLETE_SELECT },
        },
      },
      athlete: { select: SCHEDULE_ATHLETE_SELECT },
    },
  })

  const scheduleIds = schedules.map((s) => s.id)

  // Le singole righe e non un groupBy: dell'ultimo sollecito serve sapere
  // anche da che canale è partito
  const emailLogs =
    scheduleIds.length > 0
      ? await prisma.emailLog.findMany({
          where: { paymentScheduleId: { in: scheduleIds } },
          select: { paymentScheduleId: true, sentAt: true },
        })
      : []

  // Solleciti aperti su WhatsApp: non sono email, stanno in AuditLog come la
  // ricevuta condivisa. Qui si rimettono insieme le due fonti.
  const whatsappRows =
    scheduleIds.length > 0
      ? await prisma.auditLog.findMany({
          where: {
            action: AuditAction.REMINDER_WHATSAPP_OPENED,
            entityType: "PaymentSchedule",
            entityId: { in: scheduleIds },
          },
          select: { entityId: true, createdAt: true },
        })
      : []

  const tracesByScheduleId = new Map<string, ReminderTrace[]>()
  function addTrace(scheduleId: string, trace: ReminderTrace) {
    const list = tracesByScheduleId.get(scheduleId)
    if (list) list.push(trace)
    else tracesByScheduleId.set(scheduleId, [trace])
  }
  for (const log of emailLogs) {
    if (!log.paymentScheduleId) continue
    addTrace(log.paymentScheduleId, { at: log.sentAt, channel: "EMAIL" })
  }
  for (const row of whatsappRows) {
    if (!row.entityId) continue
    addTrace(row.entityId, { at: row.createdAt, channel: "WHATSAPP" })
  }

  // Ultimo metodo usato da ciascuna allieva: precompila "Incassa". Chi paga
  // in contanti paga in contanti anche il mese dopo.
  const athleteIds = [
    ...new Set(
      schedules.flatMap((s) => {
        const athlete = s.courseEnrollment?.athlete ?? s.athlete
        return athlete ? [athlete.id] : []
      }),
    ),
  ]
  const lastPayments =
    athleteIds.length > 0
      ? await prisma.payment.findMany({
          where: {
            athleteId: { in: athleteIds },
            deletedAt: null,
            status: PaymentStatus.PAID,
          },
          orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
          select: { athleteId: true, method: true },
        })
      : []
  const lastMethodByAthlete = new Map<string, PaymentMethod>()
  for (const payment of lastPayments) {
    if (!lastMethodByAthlete.has(payment.athleteId)) {
      lastMethodByAthlete.set(payment.athleteId, payment.method)
    }
  }

  const today = todayDateOnly()

  return schedules.flatMap((s) => {
    const athlete = s.courseEnrollment?.athlete ?? s.athlete
    if (!athlete) return []

    const parentRel = athlete.parentRelations[0] ?? null

    const dueUTC = new Date(
      Date.UTC(
        s.dueDate.getUTCFullYear(),
        s.dueDate.getUTCMonth(),
        s.dueDate.getUTCDate(),
      ),
    )
    const giorniRitardo = Math.round(
      (today.getTime() - dueUTC.getTime()) / (1000 * 60 * 60 * 24),
    )

    return [
      {
        id: s.id,
        dueDate: s.dueDate,
        amountCents: s.amountCents,
        status: s.status,
        feeType: s.feeType,
        notes: s.notes,
        giorniRitardo,
        athlete: {
          id: athlete.id,
          firstName: athlete.firstName,
          lastName: athlete.lastName,
        },
        courseEnrollmentId: s.courseEnrollment?.id ?? null,
        lastMethod: lastMethodByAthlete.get(athlete.id) ?? null,
        contact: parentRel
          ? {
              name: `${parentRel.parent.lastName} ${parentRel.parent.firstName}`,
              email: parentRel.parent.email,
              phone: parentRel.parent.phone,
              isAthlete: false,
              parentId: parentRel.parent.id,
            }
          : isMinorAt(athlete.dateOfBirth, today)
            ? // Minorenne senza genitori collegati: non c'è nessuno a cui
              // scrivere, e mostrarla come contatto sarebbe fuorviante
              null
            : {
                // Maggiorenne: riceve lei. Si mostra anche senza email, così
                // si vede cosa manca
                name: `${athlete.lastName} ${athlete.firstName}`,
                email: athlete.email,
                phone: athlete.phone,
                isAthlete: true,
                parentId: null,
              },
        course: s.courseEnrollment?.course ?? null,
        academicYear: {
          id: s.academicYear.id,
          label: s.academicYear.label,
        },
        reminders: summarizeReminders(tracesByScheduleId.get(s.id) ?? []),
      },
    ]
  })
}

export type ScadenzeCount = {
  stato: ScadenzeStatoFilter
  count: number
  amountCents: number
}

/**
 * I numeri sui chip dei filtri.
 *
 * Stesso `scadenzeWhere()` dell'elenco e dei riquadri della dashboard, con il
 * solo `stato` che cambia: il numero sul chip è per costruzione quello delle
 * righe che si vedono cliccandolo.
 */
export async function getScadenzeCounts(
  filter: Omit<ScadenzeFilter, "stato">,
): Promise<ScadenzeCount[]> {
  await requireAdmin()

  const stati: ScadenzeStatoFilter[] = [
    "DEFAULT",
    "IN_RITARDO",
    "IN_SCADENZA_7GG",
    "TUTTE",
  ]

  const aggregates = await Promise.all(
    stati.map((stato) =>
      prisma.paymentSchedule.aggregate({
        where: scadenzeWhere({ ...filter, stato }),
        _count: true,
        _sum: { amountCents: true },
      }),
    ),
  )

  return stati.map((stato, i) => ({
    stato,
    count: aggregates[i]._count,
    amountCents: aggregates[i]._sum.amountCents ?? 0,
  }))
}

export async function listCoursesForFilter() {
  await requireAdmin()
  return prisma.course.findMany({
    where: { isActive: true, deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })
}

export async function listAcademicYearsForFilter() {
  await requireAdmin()
  return prisma.academicYear.findMany({
    select: { id: true, label: true, isCurrent: true },
    orderBy: { startDate: "desc" },
  })
}

export async function getCurrentAcademicYear() {
  await requireAdmin()
  return prisma.academicYear.findFirst({
    where: { isCurrent: true },
    select: { id: true, label: true },
  })
}
