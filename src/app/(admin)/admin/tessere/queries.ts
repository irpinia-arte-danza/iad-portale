import "server-only"

import { AffiliationEntity } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"
import {
  classifyCard,
  CURRENT_CARD_ORDER,
  daysUntilExpiry,
  seasonYearFromAcademicYearStart,
  type CardStatus,
} from "@/lib/affiliations/card-status"
import type { ExistingCard } from "@/lib/affiliations/import-plan"
import type { MatchCandidate } from "@/lib/affiliations/name-match"
import type { CardEntity } from "@/lib/affiliations/parsers"
import { todayDateOnly } from "@/lib/utils/date-only"

export const CARD_SELECT = {
  id: true,
  entity: true,
  cardNumber: true,
  cardType: true,
  cardYear: true,
  issueDate: true,
  expiryDate: true,
  notes: true,
  filePath: true,
  fileUrl: true,
  createdAt: true,
} as const

export type AthleteCardRow = {
  athleteId: string
  athleteName: string
  card: {
    id: string
    cardNumber: string | null
    cardType: string | null
    cardYear: number
    expiryDate: Date | null
  } | null
  status: CardStatus
  daysToExpiry: number | null
}

const STATUS_PRIORITY: Record<CardStatus, number> = {
  expired: 0,
  expiring: 1,
  missing: 2,
  valid: 3,
}

// Anno sociale corrente: l'anno in cui è partito l'anno accademico in corso.
// La stagione 2026/2027 è l'"Anno sociale 2026" che ENDAS stampa in tessera.
export async function getCurrentSeasonYear(): Promise<number> {
  const year = await prisma.academicYear.findFirst({
    where: { isCurrent: true },
    select: { startDate: true },
  })
  if (!year) return todayDateOnly().getUTCFullYear()
  return seasonYearFromAcademicYearStart(year.startDate)
}

// Le allieve contro cui si abbina una tessera letta dal PDF. Le ritirate
// restano dentro: una tessera arretrata può riguardarle.
export async function getMatchCandidates(): Promise<MatchCandidate[]> {
  return prisma.athlete.findMany({
    where: { deletedAt: null },
    select: { id: true, firstName: true, lastName: true, dateOfBirth: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  })
}

export async function getActiveCards(
  entity: AffiliationEntity,
): Promise<ExistingCard[]> {
  const cards = await prisma.affiliation.findMany({
    where: { deletedAt: null, entity },
    select: {
      athleteId: true,
      entity: true,
      cardYear: true,
      cardNumber: true,
    },
  })
  return cards.map((c) => ({
    athleteId: c.athleteId,
    entity: c.entity as CardEntity,
    cardYear: c.cardYear,
    cardNumber: c.cardNumber,
  }))
}

export async function getCardsOverview(
  entity: AffiliationEntity = AffiliationEntity.ENDAS,
): Promise<AthleteCardRow[]> {
  await requireAdmin()

  const today = todayDateOnly()
  const athletes = await prisma.athlete.findMany({
    where: { deletedAt: null, status: { not: "WITHDRAWN" } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      affiliations: {
        where: { deletedAt: null, entity },
        orderBy: CURRENT_CARD_ORDER,
        take: 1,
        select: {
          id: true,
          cardNumber: true,
          cardType: true,
          cardYear: true,
          expiryDate: true,
        },
      },
    },
  })

  const rows: AthleteCardRow[] = athletes.map((a) => {
    const card = a.affiliations[0] ?? null
    return {
      athleteId: a.id,
      athleteName: `${a.lastName} ${a.firstName}`,
      card,
      status: classifyCard(card?.expiryDate ?? null, today),
      daysToExpiry: card?.expiryDate
        ? daysUntilExpiry(card.expiryDate, today)
        : null,
    }
  })

  rows.sort((a, b) => {
    const p = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status]
    if (p !== 0) return p
    return a.athleteName.localeCompare(b.athleteName, "it")
  })

  return rows
}

export type TesseramentoRow = {
  id: string
  lastName: string
  firstName: string
  gender: "F" | "M" | "OTHER"
  dateOfBirth: Date
  placeOfBirth: string | null
  provinceOfBirth: string | null
  fiscalCode: string | null
  residenceStreet: string | null
  residenceNumber: string | null
  residenceCity: string | null
  residenceProvince: string | null
  residenceCap: string | null
  email: string | null
  phone: string | null
  // Chi risponde per l'allieva: la sua email/telefono se maggiorenne, quelli
  // del genitore di riferimento altrimenti
  contactName: string | null
  contactEmail: string | null
  contactPhone: string | null
  missing: string[]
}

const REQUIRED_FIELDS: {
  key: keyof TesseramentoRow
  label: string
}[] = [
  { key: "fiscalCode", label: "codice fiscale" },
  { key: "placeOfBirth", label: "luogo di nascita" },
  { key: "provinceOfBirth", label: "provincia di nascita" },
  { key: "residenceStreet", label: "via" },
  { key: "residenceCity", label: "comune di residenza" },
  { key: "residenceProvince", label: "provincia di residenza" },
  { key: "residenceCap", label: "CAP" },
]

// Elenco da mandare al referente dell'ente: le allieve attive che per
// quell'anno sociale una tessera non ce l'hanno ancora. È il passaggio che
// precede il caricamento — prima si chiede il tesseramento, poi arrivano i PDF.
export async function getTesseramentoQueue(
  entity: AffiliationEntity,
  seasonYear: number,
): Promise<TesseramentoRow[]> {
  await requireAdmin()

  const athletes = await prisma.athlete.findMany({
    where: {
      deletedAt: null,
      status: { not: "WITHDRAWN" },
      affiliations: {
        none: { deletedAt: null, entity, cardYear: seasonYear },
      },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      gender: true,
      dateOfBirth: true,
      placeOfBirth: true,
      provinceOfBirth: true,
      fiscalCode: true,
      residenceStreet: true,
      residenceNumber: true,
      residenceCity: true,
      residenceProvince: true,
      residenceCap: true,
      email: true,
      phone: true,
      parentRelations: {
        where: { parent: { deletedAt: null } },
        orderBy: [{ isPrimaryContact: "desc" }, { isPrimaryPayer: "desc" }],
        take: 1,
        select: {
          parent: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
        },
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  })

  return athletes.map(({ parentRelations, ...a }) => {
    const parent = parentRelations[0]?.parent ?? null
    const row: TesseramentoRow = {
      ...a,
      contactName: parent ? `${parent.firstName} ${parent.lastName}` : null,
      contactEmail: parent?.email ?? a.email ?? null,
      contactPhone: parent?.phone ?? a.phone ?? null,
      missing: [],
    }
    row.missing = REQUIRED_FIELDS.filter((f) => {
      const value = row[f.key]
      return typeof value !== "string" || value.trim().length === 0
    }).map((f) => f.label)
    if (!row.contactEmail) row.missing.push("email di contatto")
    return row
  })
}
