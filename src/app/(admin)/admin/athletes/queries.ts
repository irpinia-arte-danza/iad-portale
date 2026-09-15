import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"
import {
  classifyCert,
  compareByCertificateExpiry,
  CURRENT_CERTIFICATE_ORDER,
} from "@/lib/medical-certificates/certificate-status"
import { todayDateOnly } from "@/lib/utils/date-only"

export type AthleteListSort = "name" | "certificate"

type ListFilters = {
  search?: string
  sort?: AthleteListSort
  limit?: number
  offset?: number
}

const DEFAULT_LIMIT = 50

const athleteListInclude = Prisma.validator<Prisma.AthleteInclude>()({
  _count: {
    select: {
      parentRelations: {
        where: { parent: { deletedAt: null } },
      },
    },
  },
  // Solo il certificato corrente, per la colonna "Certificato"
  medicalCertificates: {
    where: { deletedAt: null },
    orderBy: CURRENT_CERTIFICATE_ORDER,
    take: 1,
    select: { expiryDate: true },
  },
})

type AthleteListRecord = Prisma.AthleteGetPayload<{
  include: typeof athleteListInclude
}>

function toListRow(
  { medicalCertificates, ...athlete }: AthleteListRecord,
  today: Date,
) {
  const expiryDate = medicalCertificates[0]?.expiryDate ?? null
  return {
    ...athlete,
    certificate: { expiryDate, status: classifyCert(expiryDate, today) },
  }
}

export async function listAthletes(filters: ListFilters = {}) {
  await requireAdmin()

  const { search, sort = "name", limit = DEFAULT_LIMIT, offset = 0 } = filters
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
  }

  const orderBy: Prisma.AthleteOrderByWithRelationInput[] = [
    { lastName: "asc" },
    { firstName: "asc" },
  ]

  if (sort === "certificate") {
    // Il certificato corrente è una relazione: si ordina in memoria l'elenco
    // completo (poche centinaia di allieve) e poi si pagina. A parità di
    // scadenza resta l'ordine per nome (sort stabile).
    const athletes = await prisma.athlete.findMany({
      where,
      include: athleteListInclude,
      orderBy,
    })
    const rows = athletes
      .map((athlete) => toListRow(athlete, today))
      .sort((a, b) =>
        compareByCertificateExpiry(
          a.certificate.expiryDate,
          b.certificate.expiryDate,
        ),
      )
    return { items: rows.slice(offset, offset + limit), totalCount: rows.length }
  }

  const [athletes, totalCount] = await Promise.all([
    prisma.athlete.findMany({
      where,
      include: athleteListInclude,
      orderBy,
      take: limit,
      skip: offset,
    }),
    prisma.athlete.count({ where }),
  ])

  return {
    items: athletes.map((athlete) => toListRow(athlete, today)),
    totalCount,
  }
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
    enrollments: {
      include: {
        course: {
          select: {
            id: true,
            name: true,
            type: true,
            monthlyFeeCents: true,
            isActive: true,
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
          orderBy: { dueDate: "asc" },
        },
      },
      orderBy: [{ enrollmentDate: "desc" }],
    },
    // Quota associativa annuale: collegata all'allieva, non a un corso
    paymentSchedules: {
      where: { feeType: "ASSOCIATION" },
      orderBy: { dueDate: "desc" },
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
        paymentSchedules: {
          where: {
            status: { in: ["DUE", "WAIVED"] },
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
