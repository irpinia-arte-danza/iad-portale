import {
  PaymentStatus,
  Prisma,
  type PaymentMethod,
  type ReceiptStatus,
} from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"
import {
  classifyCard,
  compareByCardExpiry,
  CURRENT_CARD_ORDER,
} from "@/lib/affiliations/card-status"
import {
  ATHLETE_STEP_FILTERS,
  isStepFilter,
  type AthleteListFilter,
  type AthleteListFilterStep,
  type AthleteListSort,
  type AthleteStatusFilter,
} from "@/lib/athletes/list-filters"
import { GUARDIAN_GAP_FILTER } from "@/lib/athletes/guardian-gap"
import { athleteListPayer } from "@/lib/athletes/payer"
import { athleteSetupChecklist } from "@/lib/athletes/setup-checklist"
import {
  classifyCert,
  compareByCertificateExpiry,
  CURRENT_CERTIFICATE_ORDER,
} from "@/lib/medical-certificates/certificate-status"
import { FEE_TYPE_LABELS } from "@/lib/schemas/payment"
import { todayDateOnly } from "@/lib/utils/date-only"

import { scadenzeWhere } from "../scadenze/queries"

export type {
  AthleteListFilter,
  AthleteListSort,
} from "@/lib/athletes/list-filters"
export {
  parseAthleteListFilter,
  parseAthleteListSort,
  parseAthleteStatusFilter,
} from "@/lib/athletes/list-filters"

type ListFilters = {
  search?: string
  sort?: AthleteListSort
  filter?: AthleteListFilter
  // Corso dell'anno corrente: restringe a chi è iscritta là
  courseId?: string
  // Attive (default) o ritirate: due popolazioni separate
  stato?: AthleteStatusFilter
  limit?: number
  offset?: number
}

const DEFAULT_LIMIT = 50

// Tutto quello che serve ad athleteSetupChecklist, più il certificato e la
// tessera correnti per le colonne dell'elenco. Lo usano l'elenco allieve e il
// conteggio della dashboard: una sola forma, un solo predicato.
const athleteListInclude = Prisma.validator<Prisma.AthleteInclude>()({
  // I genitori collegati con quel poco che serve a dire chi paga: il
  // conteggio (per i passi della scheda) si ricava da qui, non da un _count
  // separato che potrebbe dire un numero diverso
  parentRelations: {
    where: { parent: { deletedAt: null } },
    orderBy: [{ isPrimaryPayer: "desc" }, { isPrimaryContact: "desc" }],
    select: {
      isPrimaryPayer: true,
      isPrimaryContact: true,
      parent: { select: { id: true, firstName: true, lastName: true } },
    },
  },
  enrollments: {
    where: { deletedAt: null },
    select: {
      academicYearId: true,
      withdrawalDate: true,
      deletedAt: true,
      // Il corso dell'anno, sotto il nome, e il filtro per corso
      course: { select: { id: true, name: true } },
    },
  },
  medicalCertificates: {
    where: { deletedAt: null },
    orderBy: CURRENT_CERTIFICATE_ORDER,
    select: { expiryDate: true, createdAt: true },
  },
  affiliations: {
    where: { deletedAt: null },
    orderBy: CURRENT_CARD_ORDER,
    select: {
      entity: true,
      cardYear: true,
      expiryDate: true,
      createdAt: true,
    },
  },
})

type AthleteListRecord = Prisma.AthleteGetPayload<{
  include: typeof athleteListInclude
}>

type ChecklistYear = {
  id: string
  label: string
  startDate: Date
} | null

export type AthleteOverdue = { count: number; amountCents: number }

const NO_OVERDUE: AthleteOverdue = { count: 0, amountCents: 0 }

// ─────────────────────────────────────────────────────────────────────────
// Contributi in ritardo per allieva.
//
// Il predicato non si riscrive: è `scadenzeWhere({ stato: "IN_RITARDO" })`,
// lo stesso dell'elenco Scadenze e del riquadro in dashboard. Una query
// sola per tutta la lista (le rate scadute sono poche centinaia) e somma in
// memoria, perché la rata è legata all'allieva per due strade diverse —
// direttamente (contributo di iscrizione) o attraverso l'iscrizione al corso
// — e un groupBy non le vede entrambe.
// ─────────────────────────────────────────────────────────────────────────
async function overdueByAthlete(): Promise<Record<string, AthleteOverdue>> {
  const schedules = await prisma.paymentSchedule.findMany({
    where: scadenzeWhere({ stato: "IN_RITARDO" }),
    select: {
      amountCents: true,
      athleteId: true,
      courseEnrollment: { select: { athleteId: true } },
    },
  })

  const byAthlete: Record<string, AthleteOverdue> = {}
  for (const s of schedules) {
    const athleteId = s.athleteId ?? s.courseEnrollment?.athleteId
    if (!athleteId) continue
    const current = byAthlete[athleteId] ?? { count: 0, amountCents: 0 }
    byAthlete[athleteId] = {
      count: current.count + 1,
      amountCents: current.amountCents + s.amountCents,
    }
  }
  return byAthlete
}

function toListRow(
  record: AthleteListRecord,
  today: Date,
  currentAcademicYear: ChecklistYear,
  overdue: Record<string, AthleteOverdue> = {},
) {
  const {
    medicalCertificates,
    affiliations,
    enrollments,
    parentRelations,
    ...athlete
  } = record
  const expiryDate = medicalCertificates[0]?.expiryDate ?? null
  const cardExpiry = affiliations[0]?.expiryDate ?? null

  // I corsi dell'anno corrente: quello che va sotto il nome, e su cui filtra
  // la select. Un'iscrizione ritirata resta qui: ha frequentato quel corso.
  const currentCourses = currentAcademicYear
    ? enrollments
        .filter((e) => e.academicYearId === currentAcademicYear.id)
        .map((e) => e.course)
    : []

  return {
    ...athlete,
    linkedParents: parentRelations.length,
    certificate: { expiryDate, status: classifyCert(expiryDate, today) },
    card: { expiryDate: cardExpiry, status: classifyCard(cardExpiry, today) },
    // Quanto deve, in ritardo: la colonna Contributi e una delle due righe
    // della card
    overdue: overdue[record.id] ?? NO_OVERDUE,
    currentCourses,
    // Chi paga, con la stessa regola della scheda allieva
    payer: athleteListPayer(
      { dateOfBirth: record.dateOfBirth, parentRelations },
      today,
    ),
    // Gli stessi passi che la scheda mostra in "Da completare"
    setupSteps: athleteSetupChecklist(
      {
        status: record.status,
        dateOfBirth: record.dateOfBirth,
        email: record.email,
        linkedParents: parentRelations.length,
        enrollments,
        certificates: medicalCertificates,
        cards: affiliations,
      },
      { currentAcademicYear, at: today },
    ).map((step) => step.id),
  }
}

export type AthleteListRow = ReturnType<typeof toListRow>

// ─────────────────────────────────────────────────────────────────────────
// I filtri, applicati in memoria sulle stesse righe che l'elenco mostra.
//
// In memoria e non in SQL perché dipendono dalla minore età, dall'anno
// accademico e dallo stato dei documenti: riscriverli in SQL vorrebbe dire
// avere due definizioni dello stesso buco (ed è il motivo per cui prima il
// riquadro in dashboard e l'elenco potevano dire numeri diversi). Sono
// poche decine di allieve e la query è una sola.
// ─────────────────────────────────────────────────────────────────────────
function matchesFilter(row: AthleteListRow, filter: AthleteListFilter): boolean {
  if (isStepFilter(filter)) {
    return row.setupSteps.includes(ATHLETE_STEP_FILTERS[filter])
  }
  return row.overdue.count > 0
}

function matchesCourse(row: AthleteListRow, courseId: string): boolean {
  return row.currentCourses.some((c) => c.id === courseId)
}

async function currentAcademicYearForChecklist(): Promise<ChecklistYear> {
  return prisma.academicYear.findFirst({
    where: { isCurrent: true },
    select: { id: true, label: true, startDate: true },
  })
}

export type AthleteListCounts = {
  // Senza filtro: tutte le righe della popolazione scelta (attive o ritirate)
  tutte: number
  certificate: number
  guardian: number
  overdue: { count: number; amountCents: number }
}

export type AthleteListResult = {
  items: AthleteListRow[]
  totalCount: number
  counts: AthleteListCounts
}

// ─────────────────────────────────────────────────────────────────────────
// L'elenco allieve, in un numero fisso di query.
//
// Tre query e non una per riga: le allieve con i loro documenti, l'anno
// accademico corrente e le rate in ritardo (una query sola, sommata in
// memoria). Con 58 allieve o con 580 il numero di query non cambia.
//
// I conteggi dei chip si calcolano sulle **stesse righe** che l'elenco
// mostrerebbe, con gli stessi predicati: il numero sul chip è per
// costruzione le righe che apre, e senza filtro per corso coincide con i
// riquadri della dashboard, che contano con le stesse funzioni
// (athleteSetupChecklist, scadenzeWhere).
// ─────────────────────────────────────────────────────────────────────────
export async function listAthletes(
  filters: ListFilters = {},
): Promise<AthleteListResult> {
  await requireAdmin()

  const {
    search,
    sort = "name",
    filter,
    courseId,
    stato = "attive",
    limit = DEFAULT_LIMIT,
    offset = 0,
  } = filters
  const today = todayDateOnly()

  const where: Prisma.AthleteWhereInput = {
    deletedAt: null,
    ...(search && search.trim().length > 0
      ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
    // Attive e ritirate sono due elenchi diversi: "Attiva" su ogni riga non
    // diceva niente, e chi ha smesso si guarda a parte
    status:
      stato === "ritirate" ? "WITHDRAWN" : { not: "WITHDRAWN" as const },
  }

  const [athletes, currentAcademicYear, overdue] = await Promise.all([
    prisma.athlete.findMany({
      where,
      include: athleteListInclude,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    currentAcademicYearForChecklist(),
    overdueByAthlete(),
  ])

  const all = athletes.map((athlete) =>
    toListRow(athlete, today, currentAcademicYear, overdue),
  )

  // Il corso restringe tutto, chip compresi: i numeri dicono sempre quante
  // righe aprirebbe quel chip con i filtri che sono attivi adesso
  const inScope = courseId
    ? all.filter((row) => matchesCourse(row, courseId))
    : all

  const counts: AthleteListCounts = {
    tutte: inScope.length,
    certificate: inScope.filter((row) =>
      matchesFilter(row, "senza-certificato"),
    ).length,
    guardian: inScope.filter((row) => matchesFilter(row, GUARDIAN_GAP_FILTER))
      .length,
    overdue: inScope.reduce(
      (acc, row) => ({
        count: acc.count + (row.overdue.count > 0 ? 1 : 0),
        amountCents: acc.amountCents + row.overdue.amountCents,
      }),
      { count: 0, amountCents: 0 },
    ),
  }

  const rows = filter
    ? inScope.filter((row) => matchesFilter(row, filter))
    : inScope

  // A parità di chiave resta l'ordine per cognome: sort stabile
  if (sort === "certificate") {
    rows.sort((a, b) =>
      compareByCertificateExpiry(a.certificate.expiryDate, b.certificate.expiryDate),
    )
  } else if (sort === "card") {
    rows.sort((a, b) => compareByCardExpiry(a.card.expiryDate, b.card.expiryDate))
  } else if (sort === "overdue") {
    // Prima chi deve di più: è l'ordine con cui si fanno le telefonate
    rows.sort((a, b) => b.overdue.amountCents - a.overdue.amountCents)
  }

  return {
    items: rows.slice(offset, offset + limit),
    totalCount: rows.length,
    counts,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Conteggi per i riquadri della dashboard.
//
// Stessa popolazione dell'elenco e della scheda (non cestinate, non
// ritirate) e stesso predicato: i passi li decide athleteSetupChecklist. Il
// numero sul riquadro è per costruzione uguale alle righe dell'elenco che
// apre, non perché due query scritte a parte capita che coincidano.
// ─────────────────────────────────────────────────────────────────────────
/**
 * I passi che la lista allieve sa filtrare, contati sulla stessa funzione che
 * decide i passi nella scheda (`athleteSetupChecklist`): il riquadro in
 * dashboard e l'elenco che apre non possono dire numeri diversi.
 *
 * Certificati e tessere non stanno qui: i loro riquadri contano gli elenchi
 * delle rispettive pagine (`getCertificateStatusCounts`,
 * `countTesseramentoQueue`), che è dove portano.
 */
export type AthleteStepCounts = Record<AthleteListFilterStep, number>

export async function countAthleteSteps(): Promise<AthleteStepCounts> {
  await requireAdmin()

  const today = todayDateOnly()
  const [athletes, currentAcademicYear] = await Promise.all([
    prisma.athlete.findMany({
      // Stessa popolazione della lista: le ritirate non hanno niente da
      // completare
      where: { deletedAt: null, status: { not: "WITHDRAWN" } },
      include: athleteListInclude,
    }),
    currentAcademicYearForChecklist(),
  ])

  const counts: AthleteStepCounts = {
    guardian: 0,
    email: 0,
    course: 0,
    certificate: 0,
  }

  for (const athlete of athletes) {
    const row = toListRow(athlete, today, currentAcademicYear)
    for (const step of row.setupSteps) {
      if (step in counts) counts[step as AthleteListFilterStep] += 1
    }
  }

  return counts
}

const athleteWithRelations = Prisma.validator<Prisma.AthleteDefaultArgs>()({
  include: {
    parentRelations: {
      where: { parent: { deletedAt: null } },
      include: { parent: true },
      orderBy: [
        { isPrimaryContact: "desc" },
        { isPrimaryPayer: "desc" },
      ],
    },
    // Le iscrizioni annullate (errore di inserimento) stanno nel Cestino e non
    // compaiono qui, con le loro rate
    enrollments: {
      where: { deletedAt: null },
      include: {
        course: {
          select: {
            id: true,
            name: true,
            type: true,
            monthlyFeeCents: true,
            isActive: true,
            // Giorno e orario: la panoramica dice quando si allena
            schedules: {
              select: {
                dayOfWeek: true,
                startTime: true,
                endTime: true,
                location: true,
              },
              orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
            },
          },
        },
        academicYear: {
          select: {
            id: true,
            label: true,
            isCurrent: true,
          },
        },
        paymentSchedules: {
          where: { deletedAt: null },
          orderBy: { dueDate: "asc" },
        },
      },
      orderBy: [{ enrollmentDate: "desc" }],
    },
    // Contributo di iscrizione annuale: collegato all'allieva, non a un corso
    paymentSchedules: {
      where: { feeType: "ASSOCIATION", deletedAt: null },
      orderBy: { dueDate: "desc" },
      // Serve alla dicitura del contributo ("… 2026/2027")
      include: { academicYear: { select: { label: true } } },
    },
    // Sprint 1.B: certificati medici (corrente + storico). Filtra non-deleted.
    medicalCertificates: {
      where: { deletedAt: null },
      orderBy: CURRENT_CERTIFICATE_ORDER,
      select: {
        id: true,
        type: true,
        issueDate: true,
        expiryDate: true,
        doctorName: true,
        notes: true,
        filePath: true,
        createdAt: true,
      },
    },
    // Tessere dell'ente (corrente + storico), gemelle dei certificati
    affiliations: {
      where: { deletedAt: null },
      orderBy: CURRENT_CARD_ORDER,
      select: {
        id: true,
        entity: true,
        cardNumber: true,
        cardType: true,
        cardYear: true,
        issueDate: true,
        expiryDate: true,
        filePath: true,
        createdAt: true,
      },
    },
  },
})

export type AthleteWithRelations = Prisma.AthleteGetPayload<
  typeof athleteWithRelations
>

export type AthleteParentRelation =
  AthleteWithRelations["parentRelations"][number]

export type AthleteEnrollment =
  AthleteWithRelations["enrollments"][number]

export type AthletePaymentSchedule =
  AthleteEnrollment["paymentSchedules"][number]

export type AthleteAssociationSchedule =
  AthleteWithRelations["paymentSchedules"][number]

export async function getAthleteById(
  id: string,
): Promise<AthleteWithRelations | null> {
  await requireAdmin()

  return prisma.athlete.findUnique({
    where: { id, deletedAt: null },
    ...athleteWithRelations,
  })
}

const athleteForPDF = Prisma.validator<Prisma.AthleteDefaultArgs>()({
  include: {
    parentRelations: {
      where: { parent: { deletedAt: null } },
      include: { parent: true },
      orderBy: [
        { isPrimaryContact: "desc" },
        { isPrimaryPayer: "desc" },
      ],
    },
    enrollments: {
      where: { deletedAt: null },
      include: {
        course: {
          select: {
            id: true,
            name: true,
            type: true,
            teacher: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        academicYear: {
          select: { id: true, label: true, isCurrent: true },
        },
        // Scheda per la famiglia: solo le quote da pagare, mai le non dovute
        paymentSchedules: {
          where: {
            status: "DUE",
            deletedAt: null,
          },
          orderBy: { dueDate: "asc" },
        },
      },
      orderBy: [{ enrollmentDate: "desc" }],
    },
    payments: {
      where: { status: "PAID", deletedAt: null },
      include: {
        courseEnrollment: {
          select: {
            course: { select: { name: true } },
          },
        },
        // Tipo quota dei pagamenti su più scadenze
        paymentSchedules: { select: { feeType: true, amountCents: true } },
      },
      orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
    },
  },
})

export type AthleteForPDF = Prisma.AthleteGetPayload<typeof athleteForPDF>

export type BrandForPDF = {
  logoUrl: string | null
  logoSvgUrl: string | null
  asdName: string | null
}

export type AthletePDFPayload = {
  athlete: AthleteForPDF
  brand: BrandForPDF | null
}

/**
 * Ultimo metodo usato dalla famiglia: precompila l'incasso dalla scheda,
 * come fa l'elenco Scadenze. Chi paga in contanti paga in contanti anche il
 * mese dopo.
 */
export async function getAthleteLastPaymentMethod(
  athleteId: string,
): Promise<PaymentMethod | null> {
  await requireAdmin()
  const last = await prisma.payment.findFirst({
    where: { athleteId, deletedAt: null, status: PaymentStatus.PAID },
    orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
    select: { method: true },
  })
  return last?.method ?? null
}

export type AthleteRecentPayment = {
  id: string
  paymentDate: Date
  amountCents: number
  method: PaymentMethod
  description: string
  receipt: {
    id: string
    receiptNumber: string
    status: ReceiptStatus
    payerName: string | null
    payerEmail: string | null
  } | null
}

/**
 * Gli ultimi pagamenti dell'allieva, con la ricevuta se è stata emessa: la
 * panoramica ne mostra tre, con il tasto per consegnarla.
 */
export async function getAthleteRecentPayments(
  athleteId: string,
  limit = 3,
): Promise<AthleteRecentPayment[]> {
  await requireAdmin()

  const payments = await prisma.payment.findMany({
    where: { athleteId, deletedAt: null, status: PaymentStatus.PAID },
    orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: {
      id: true,
      paymentDate: true,
      amountCents: true,
      method: true,
      feeType: true,
      notes: true,
      courseEnrollment: { select: { course: { select: { name: true } } } },
      receipt: {
        select: {
          id: true,
          receiptNumber: true,
          status: true,
          payerName: true,
          payerEmail: true,
        },
      },
    },
  })

  return payments.map((p) => ({
    id: p.id,
    paymentDate: p.paymentDate,
    amountCents: p.amountCents,
    method: p.method,
    description:
      p.courseEnrollment?.course.name ??
      p.notes ??
      FEE_TYPE_LABELS[p.feeType] ??
      "Pagamento",
    receipt: p.receipt,
  }))
}

export async function getAthleteForPDF(
  id: string,
): Promise<AthletePDFPayload | null> {
  await requireAdmin()

  const [athlete, brand] = await Promise.all([
    prisma.athlete.findUnique({
      where: { id, deletedAt: null },
      ...athleteForPDF,
    }),
    prisma.brandSettings.findUnique({
      where: { id: 1 },
      select: {
        logoUrl: true,
        logoSvgUrl: true,
        asdName: true,
      },
    }),
  ])

  if (!athlete) return null
  return { athlete, brand }
}
