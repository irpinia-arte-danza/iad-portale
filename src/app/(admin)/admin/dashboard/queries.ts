import { AffiliationEntity, AthleteStatus } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"
import type { TodoCounters } from "@/lib/dashboard/todo-tiles"
import { todayDateOnly } from "@/lib/utils/date-only"

import { countAthleteSteps } from "../athletes/queries"
import { getCertificateStatusCounts } from "../medical-certificates/queries"
import { countReceiptsToDeliver } from "@/lib/receipts/delivery-status"
import { todayInRome } from "@/lib/receipts/numbering"

import { countPaymentsMissingReceipt } from "../payments/queries"
import { scadenzeWhere } from "../scadenze/queries"
import {
  countTesseramentoQueue,
  getCurrentSeasonYear,
} from "../tessere/queries"

export async function getDashboardStats() {
  await requireAdmin()

  const [
    athletesTotal,
    athletesActive,
    athletesTrial,
    athletesSuspended,
    parentsTotal,
  ] = await Promise.all([
    prisma.athlete.count({ where: { deletedAt: null } }),
    prisma.athlete.count({
      where: { deletedAt: null, status: AthleteStatus.ACTIVE },
    }),
    prisma.athlete.count({
      where: { deletedAt: null, status: AthleteStatus.TRIAL },
    }),
    prisma.athlete.count({
      where: { deletedAt: null, status: AthleteStatus.SUSPENDED },
    }),
    prisma.parent.count({ where: { deletedAt: null } }),
  ])

  // Le scadenze non stanno più qui: contava le rate in ritardo con una
  // condizione sua, scritta a mano, che nessuna card mostrava. Il numero
  // vero è quello del riquadro "Da fare", che usa il filtro dell'elenco.
  return {
    athletesTotal,
    athletesActive,
    athletesTrial,
    athletesSuspended,
    parentsTotal,
  }
}

export async function getScadenzeKPI() {
  await requireAdmin()

  // Lo stesso filtro dell'elenco Scadenze, non una query scritta a parte:
  // il riquadro in dashboard e la lista che apre contano le stesse righe.
  const [inRitardo, inScadenza7gg] = await Promise.all([
    prisma.paymentSchedule.aggregate({
      where: scadenzeWhere({ stato: "IN_RITARDO" }),
      _sum: { amountCents: true },
      _count: true,
    }),
    prisma.paymentSchedule.aggregate({
      where: scadenzeWhere({ stato: "IN_SCADENZA_7GG" }),
      _sum: { amountCents: true },
      _count: true,
    }),
  ])

  const inRitardoCount = inRitardo._count
  const inRitardoAmount = inRitardo._sum.amountCents ?? 0
  const inScadenzaCount = inScadenza7gg._count
  const inScadenzaAmount = inScadenza7gg._sum.amountCents ?? 0

  return {
    inRitardo: {
      count: inRitardoCount,
      amountCents: inRitardoAmount,
    },
    inScadenza7gg: {
      count: inScadenzaCount,
      amountCents: inScadenzaAmount,
    },
    total: {
      count: inRitardoCount + inScadenzaCount,
      amountCents: inRitardoAmount + inScadenzaAmount,
    },
  }
}

export type ScadenzeKPI = Awaited<ReturnType<typeof getScadenzeKPI>>

export async function getRecentAthletes(limit = 5) {
  await requireAdmin()
  return prisma.athlete.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      createdAt: true,
      status: true,
    },
  })
}

export async function getUpcomingStages(limit = 3) {
  await requireAdmin()
  const today = todayDateOnly()

  return prisma.stage.findMany({
    where: {
      deletedAt: null,
      date: { gte: today },
    },
    orderBy: { date: "asc" },
    take: limit,
    include: {
      _count: { select: { enrollments: true } },
    },
  })
}

export async function countUpcomingStages() {
  await requireAdmin()
  const today = todayDateOnly()
  return prisma.stage.count({
    where: { deletedAt: null, date: { gte: today } },
  })
}

export async function getCurrentShowcaseStats() {
  await requireAdmin()

  const ay = await prisma.academicYear.findFirst({
    where: { isCurrent: true },
    select: { id: true, label: true },
  })
  if (!ay) return null

  const showcase = await prisma.showcase.findUnique({
    where: { academicYearId: ay.id },
    select: {
      id: true,
      title: true,
      date: true,
      deletedAt: true,
      participations: {
        select: {
          id: true,
          confirmed: true,
          paymentSchedules: {
            select: { status: true, feeType: true },
          },
          costumeAssignments: {
            where: { costume: { deletedAt: null } },
            select: { id: true, paid: true },
          },
        },
      },
      costumes: {
        where: { deletedAt: null },
        select: { id: true },
      },
    },
  })
  if (!showcase || showcase.deletedAt) {
    return { exists: false as const, academicYearLabel: ay.label }
  }

  let totalParticipants = 0
  let confirmed = 0
  let pending = 0
  let paidFirst = 0
  let paidSecond = 0
  let costumeAssignments = 0
  let costumePaid = 0
  for (const p of showcase.participations) {
    totalParticipants += 1
    if (p.confirmed) confirmed += 1
    else pending += 1
    for (const s of p.paymentSchedules) {
      if (s.status !== "PAID") continue
      if (s.feeType === "SHOWCASE_1") paidFirst += 1
      else if (s.feeType === "SHOWCASE_2") paidSecond += 1
    }
    for (const a of p.costumeAssignments) {
      costumeAssignments += 1
      if (a.paid) costumePaid += 1
    }
  }

  return {
    exists: true as const,
    id: showcase.id,
    title: showcase.title,
    date: showcase.date,
    academicYearLabel: ay.label,
    totalParticipants,
    confirmed,
    pending,
    paidFirst,
    paidSecond,
    costumesCount: showcase.costumes.length,
    costumeAssignments,
    costumePaid,
  }
}

export async function getRecentParents(limit = 5) {
  await requireAdmin()
  return prisma.parent.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      createdAt: true,
      _count: {
        select: {
          athleteRelations: { where: { athlete: { deletedAt: null } } },
        },
      },
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────
// I numeri del blocco "Da fare".
//
// Ogni contatore viene dal modulo dell'elenco che il riquadro apre, e usa il
// suo stesso predicato: le scadenze da `scadenzeWhere`, i pagamenti senza
// ricevuta da `MISSING_RECEIPT_WHERE`, i passi delle allieve dalla stessa
// `athleteSetupChecklist` che disegna il blocco "Da completare" nella scheda,
// i certificati e le tessere dalle query delle loro pagine. Qui non si
// riscrive nessuna condizione.
// ─────────────────────────────────────────────────────────────────────────
export async function getTodoCounters(): Promise<TodoCounters> {
  await requireAdmin()

  const seasonYear = await getCurrentSeasonYear()

  const [
    scadenze,
    senzaRicevuta,
    daConsegnare,
    steps,
    certificati,
    daTesserare,
  ] = await Promise.all([
    getScadenzeKPI(),
    countPaymentsMissingReceipt(),
    // Anno solare corrente, lo stesso con cui si apre l'elenco Ricevute: il
    // riquadro e il chip contano le stesse righe
    countReceiptsToDeliver(todayInRome().getUTCFullYear()),
    countAthleteSteps(),
    getCertificateStatusCounts(),
    countTesseramentoQueue(AffiliationEntity.ENDAS, seasonYear),
  ])

  return {
    scadenzeInRitardo: scadenze.inRitardo,
    inScadenza7gg: scadenze.inScadenza7gg.count,
    pagamentiSenzaRicevuta: senzaRicevuta,
    ricevuteDaConsegnare: daConsegnare,
    allieveSenzaGenitore: steps.guardian,
    allieveSenzaCorso: steps.course,
    allieveSenzaEmail: steps.email,
    certificatiScaduti: certificati.expired,
    certificatiInScadenza: certificati.expiring,
    certificatiAssenti: certificati.missing,
    tessereDaFare: { count: daTesserare, seasonYear },
  }
}
