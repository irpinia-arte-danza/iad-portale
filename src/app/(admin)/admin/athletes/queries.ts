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
  ATHLETE_LIST_FILTERS,
  type AthleteListFilter,
  type AthleteListFilterStep,
} from "@/lib/athletes/list-filters"
import { athleteSetupChecklist } from "@/lib/athletes/setup-checklist"
import {
  classifyCert,
  compareByCertificateExpiry,
  CURRENT_CERTIFICATE_ORDER,
} from "@/lib/medical-certificates/certificate-status"
import { FEE_TYPE_LABELS } from "@/lib/schemas/payment"
import { todayDateOnly } from "@/lib/utils/date-only"

export type AthleteListSort = "name" | "certificate" | "card"

export type { AthleteListFilter } from "@/lib/athletes/list-filters"
export { parseAthleteListFilter } from "@/lib/athletes/list-filters"

type ListFilters = {
  search?: string
  sort?: AthleteListSort
  filter?: AthleteListFilter
  limit?: number
  offset?: number
}

const DEFAULT_LIMIT = 50

// Tutto quello che serve ad athleteSetupChecklist, più il certificato e la
// tessera correnti per le colonne dell'elenco. Lo usano l'elenco allieve e il
// conteggio della dashboard: una sola forma, un solo predicato.
const athleteListInclude = Prisma.validator<Prisma.AthleteInclude>()({
  _count: {
    select: {
      parentRelations: {
        where: { parent: { deletedAt: null } },
      },
    },
  },
  enrollments: {
    where: { deletedAt: null },
    select: {
      academicYearId: true,
      withdrawalDate: true,
      deletedAt: true,
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

function toListRow(
  record: AthleteListRecord,
  today: Date,
  currentAcademicYear: ChecklistYear,
) {
  const { medicalCertificates, affiliations, enrollments, ...athlete } = record
  const expiryDate = medicalCertificates[0]?.expiryDate ?? null
  const cardExpiry = affiliations[0]?.expiryDate ?? null
  return {
    ...athlete,
    certificate: { expiryDate, status: classifyCert(expiryDate, today) },
    card: { expiryDate: cardExpiry, status: classifyCard(cardExpiry, today) },
    // Gli stessi passi che la scheda mostra in "Da completare"
    setupSteps: athleteSetupChecklist(
      {
        status: record.status,
        dateOfBirth: record.dateOfBirth,
        email: record.email,
        linkedParents: record._count.parentRelations,
        enrollments,
        certificates: medicalCertificates,
        cards: affiliations,
      },
      { currentAcademicYear, at: today },
    ).map((step) => step.id),
  }
}

async function currentAcademicYearForChecklist(): Promise<ChecklistYear> {
  return prisma.academicYear.findFirst({
    where: { isCurrent: true },
    select: { id: true, label: true, startDate: true },
  })
}

export async function listAthletes(filters: ListFilters = {}) {
  await requireAdmin()

  const {
    search,
    sort = "name",
    filter,
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
    // Con un filtro attivo le ritirate restano fuori, come nella scheda: a
    // chi ha smesso non si chiede di completare niente. Il resto del
    // predicato NON si riscrive in SQL — lo decide athleteSetupChecklist in
    // memoria, così elenco, scheda e dashboard usano la stessa regola. Sono
    // poche decine di allieve.
    ...(filter ? { status: { not: "WITHDRAWN" as const } } : {}),
  }

  const orderBy: Prisma.AthleteOrderByWithRelationInput[] = [
    { lastName: "asc" },
    { firstName: "asc" },
  ]

  const inMemory =
    sort === "certificate" || sort === "card" || filter !== undefined

  if (inMemory) {
    // Ordinamenti per certificato o tessera e filtri sui passi mancanti
    // dipendono da relazioni, dalla minore età e dall'anno accademico: si
    // lavora in memoria sull'elenco completo (poche decine di allieve) e poi
    // si pagina. A parità di scadenza resta l'ordine per nome (sort stabile).
    const [athletes, currentAcademicYear] = await Promise.all([
      prisma.athlete.findMany({
        where,
        include: athleteListInclude,
        orderBy,
      }),
      currentAcademicYearForChecklist(),
    ])
    let rows = athletes.map((athlete) =>
      toListRow(athlete, today, currentAcademicYear),
    )

    if (filter) {
      const step = ATHLETE_LIST_FILTERS[filter]
      rows = rows.filter((row) => row.setupSteps.includes(step))
    }

    if (sort === "card" || sort === "certificate") {
      rows.sort((a, b) =>
        sort === "card"
          ? compareByCardExpiry(a.card.expiryDate, b.card.expiryDate)
          : compareByCertificateExpiry(
              a.certificate.expiryDate,
              b.certificate.expiryDate,
            ),
      )
    }

    return { items: rows.slice(offset, offset + limit), totalCount: rows.length }
  }

  const [athletes, totalCount, currentAcademicYear] = await Promise.all([
    prisma.athlete.findMany({
      where,
      include: athleteListInclude,
      orderBy,
      take: limit,
      skip: offset,
    }),
    prisma.athlete.count({ where }),
    currentAcademicYearForChecklist(),
  ])

  return {
    items: athletes.map((athlete) =>
      toListRow(athlete, today, currentAcademicYear),
    ),
    totalCount,
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

  const counts: AthleteStepCounts = { guardian: 0, email: 0, course: 0 }

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
        fileUrl: true,
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
        fileUrl: true,
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
