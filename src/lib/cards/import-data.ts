import "server-only"

import { AffiliationEntity } from "@prisma/client"

import { seasonYearFromAcademicYearStart } from "@/lib/affiliations/card-status"
import type { ExistingCard } from "@/lib/affiliations/import-plan"
import type { MatchCandidate } from "@/lib/affiliations/name-match"
import type { CardEntity } from "@/lib/affiliations/parsers"
import { prisma } from "@/lib/prisma"
import { todayDateOnly } from "@/lib/utils/date-only"

// ─────────────────────────────────────────────────────────────────────────
// I dati che servono al caricamento delle tessere, SENZA controllo di ruolo.
//
// Li usano due porte: le query admin (requireAdmin) e le azioni di
// caricamento condivise con il referente tessere (requireCardUploader). Il
// controllo lo fa chi chiama, sempre come prima cosa: qui non si entra
// senza essere passati da una guardia. I campi sono quelli dell'abbinamento:
// nome, cognome, data di nascita. Niente contatti.
// ─────────────────────────────────────────────────────────────────────────

// Anno sociale corrente: l'anno in cui è partito l'anno accademico in corso.
// La stagione 2026/2027 è l'"Anno sociale 2026" che ENDAS stampa in tessera.
export async function currentSeasonYearData(): Promise<number> {
  const year = await prisma.academicYear.findFirst({
    where: { isCurrent: true },
    select: { startDate: true },
  })
  if (!year) return todayDateOnly().getUTCFullYear()
  return seasonYearFromAcademicYearStart(year.startDate)
}

// Le allieve contro cui si abbina una tessera letta dal PDF. Le ritirate
// restano dentro: una tessera arretrata può riguardarle.
export async function matchCandidatesData(): Promise<MatchCandidate[]> {
  return prisma.athlete.findMany({
    where: { deletedAt: null },
    select: { id: true, firstName: true, lastName: true, dateOfBirth: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  })
}

export async function activeCardsData(entity: AffiliationEntity): Promise<ExistingCard[]> {
  const cards = await prisma.affiliation.findMany({
    where: { deletedAt: null, entity },
    select: { athleteId: true, entity: true, cardYear: true, cardNumber: true },
  })
  return cards.map((c) => ({
    athleteId: c.athleteId,
    entity: c.entity as CardEntity,
    cardYear: c.cardYear,
    cardNumber: c.cardNumber,
  }))
}
