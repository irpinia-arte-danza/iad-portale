import "server-only"

import { AffiliationEntity } from "@prisma/client"

import { tesseramentoQueueWhere } from "@/app/(admin)/admin/tessere/queries"
import { requireCardManager } from "@/lib/auth/require-card-manager"
import { prisma } from "@/lib/prisma"

import { currentSeasonYearData } from "./import-data"

// ─────────────────────────────────────────────────────────────────────────
// Le query del referente tessere. Sue, non quelle dell'admin.
//
// Il referente vede SOLO quello che l'ente chiede per il tesseramento:
// cognome, nome, data e luogo di nascita, codice fiscale, residenza. Niente
// contatti, niente genitori, niente certificati, niente pagamenti, niente
// note. I select qui sotto sono l'elenco esatto, e manager-queries.test.ts
// controlla sia i select sia il tipo dei risultati: un campo in più non
// passa senza che un test lo dica. La coda è la stessa dell'admin
// (tesseramentoQueueWhere): stesso contatore, stesse allieve.
// ─────────────────────────────────────────────────────────────────────────

export const CARD_MANAGER_ENTITY = AffiliationEntity.ENDAS

// I campi anagrafici della coda: nient'altro esce dal database
export const CARD_MANAGER_QUEUE_SELECT = {
  id: true,
  lastName: true,
  firstName: true,
  dateOfBirth: true,
  placeOfBirth: true,
  provinceOfBirth: true,
  fiscalCode: true,
  residenceStreet: true,
  residenceNumber: true,
  residenceCity: true,
  residenceProvince: true,
  residenceCap: true,
} as const

export type CardManagerQueueRow = {
  id: string
  lastName: string
  firstName: string
  dateOfBirth: Date
  placeOfBirth: string | null
  provinceOfBirth: string | null
  fiscalCode: string | null
  residenceStreet: string | null
  residenceNumber: string | null
  residenceCity: string | null
  residenceProvince: string | null
  residenceCap: string | null
  // Quali dati mancano per tesserarla (li completa la segreteria)
  missing: string[]
}

const REQUIRED: { key: keyof CardManagerQueueRow; label: string }[] = [
  { key: "fiscalCode", label: "codice fiscale" },
  { key: "placeOfBirth", label: "luogo di nascita" },
  { key: "provinceOfBirth", label: "provincia di nascita" },
  { key: "residenceStreet", label: "via" },
  { key: "residenceCity", label: "comune di residenza" },
  { key: "residenceProvince", label: "provincia di residenza" },
  { key: "residenceCap", label: "CAP" },
]

export function missingCardFields(row: Omit<CardManagerQueueRow, "missing">): string[] {
  return REQUIRED.filter((f) => {
    const value = row[f.key as keyof typeof row]
    return typeof value !== "string" || value.trim().length === 0
  }).map((f) => f.label)
}

export async function getCardManagerSeasonYear(): Promise<number> {
  await requireCardManager()
  return currentSeasonYearData()
}

export async function getCardManagerQueue(
  seasonYear: number,
): Promise<CardManagerQueueRow[]> {
  await requireCardManager()
  const athletes = await prisma.athlete.findMany({
    where: tesseramentoQueueWhere(CARD_MANAGER_ENTITY, seasonYear),
    select: CARD_MANAGER_QUEUE_SELECT,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  })
  return athletes.map((a) => ({ ...a, missing: missingCardFields(a) }))
}

export const CARD_MANAGER_CARD_SELECT = {
  id: true,
  cardNumber: true,
  expiryDate: true,
  athlete: { select: { lastName: true, firstName: true } },
} as const

export type CardManagerCardRow = {
  id: string
  lastName: string
  firstName: string
  cardNumber: string | null
  expiryDate: Date | null
}

// Le tessere ENDAS della stagione: sola lettura
export async function getCardManagerCards(seasonYear: number): Promise<CardManagerCardRow[]> {
  await requireCardManager()
  const cards = await prisma.affiliation.findMany({
    where: {
      deletedAt: null,
      entity: CARD_MANAGER_ENTITY,
      cardYear: seasonYear,
      athlete: { deletedAt: null },
    },
    select: CARD_MANAGER_CARD_SELECT,
    orderBy: [{ athlete: { lastName: "asc" } }, { athlete: { firstName: "asc" } }],
  })
  return cards.map((c) => ({
    id: c.id,
    lastName: c.athlete.lastName,
    firstName: c.athlete.firstName,
    cardNumber: c.cardNumber,
    expiryDate: c.expiryDate,
  }))
}
