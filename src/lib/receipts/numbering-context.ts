import "server-only"

import type { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"

import { todayInRome } from "./numbering"
import {
  counterCandidate,
  nextReceiptSequence,
  periodKey,
  type ReceiptNumberingConfig,
} from "./numbering-config"

// ─────────────────────────────────────────────────────────────────────────
// Contesto della numerazione al momento dell'emissione: formato scelto,
// giorno di emissione, anno accademico che lo contiene, periodo del
// contatore. Tutto si legge dalla data di emissione.
// ─────────────────────────────────────────────────────────────────────────

export type ReceiptNumberingContext = {
  config: ReceiptNumberingConfig
  issueDate: Date
  academicYearLabel: string | null
  // Estremi del periodo accademico: dall'inizio dell'anno di riferimento
  // all'inizio del successivo (aperto se non c'è ancora)
  academicYearRange: { start: Date; nextStart: Date | null } | null
  period: string
  counter: { number: number; period: string | null }
}

type Client = Prisma.TransactionClient | typeof prisma

export class ReceiptNumberingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ReceiptNumberingError"
  }
}

export type AcademicYearAt = {
  label: string
  start: Date
  // Inizio dell'anno accademico successivo, se esiste: chiude il periodo
  nextStart: Date | null
} | null

// L'anno accademico di riferimento per una data di emissione: l'ULTIMO
// INIZIATO, non quello che contiene il giorno.
//
// Gli anni accademici finiscono a giugno, quindi luglio e agosto non stanno
// dentro nessuno: cercando un anno che contenga il giorno, una ricevuta
// emessa d'estate resterebbe senza etichetta e senza periodo. L'ultimo
// iniziato copre anche l'estate, fino all'inizio di quello nuovo.
export async function resolveAcademicYearAt(
  client: Client,
  issueDate: Date,
): Promise<AcademicYearAt> {
  const current = await client.academicYear.findFirst({
    where: { startDate: { lte: issueDate } },
    select: { label: true, startDate: true },
    orderBy: { startDate: "desc" },
  })
  if (!current) return null

  const next = await client.academicYear.findFirst({
    where: { startDate: { gt: current.startDate } },
    select: { startDate: true },
    orderBy: { startDate: "asc" },
  })

  return {
    label: current.label,
    start: current.startDate,
    nextStart: next?.startDate ?? null,
  }
}

// Compone il contesto da una configurazione qualsiasi: quella salvata per
// l'emissione, quella ancora da salvare per la guardia e per l'anteprima
// delle impostazioni.
export function makeNumberingContext(params: {
  config: ReceiptNumberingConfig
  issueDate: Date
  academicYear: AcademicYearAt
  counter: { number: number; period: string | null }
}): ReceiptNumberingContext {
  const label = params.academicYear?.label ?? null
  return {
    config: params.config,
    issueDate: params.issueDate,
    academicYearLabel: label,
    academicYearRange: params.academicYear
      ? {
          start: params.academicYear.start,
          nextStart: params.academicYear.nextStart,
        }
      : null,
    period: periodKey(params.config, params.issueDate, label),
    counter: params.counter,
  }
}

export async function loadNumberingContext(
  client: Client = prisma,
  issueDate: Date = todayInRome(),
): Promise<ReceiptNumberingContext> {
  const settings = await client.receiptSettings.findUnique({
    where: { id: 1 },
    select: {
      receiptPrefix: true,
      receiptNumber: true,
      receiptPeriod: true,
      receiptYearMode: true,
      receiptResetMode: true,
      receiptDigits: true,
    },
  })
  if (!settings) {
    throw new ReceiptNumberingError(
      "Impostazioni ricevute mancanti: configurale in Impostazioni → Ricevute.",
    )
  }

  return makeNumberingContext({
    config: {
      prefix: settings.receiptPrefix,
      yearMode: settings.receiptYearMode,
      resetMode: settings.receiptResetMode,
      digits: settings.receiptDigits,
    },
    issueDate,
    academicYear: await resolveAcademicYearAt(client, issueDate),
    counter: {
      number: settings.receiptNumber,
      period: settings.receiptPeriod,
    },
  })
}

// Le ricevute che appartengono allo stesso periodo di questa emissione.
// L'appartenenza si ricava dalla data di emissione e non da una chiave
// congelata sulla riga: così un cambio di configurazione a metà anno fa
// proseguire la serie invece di ripartire da 1 in mezzo all'anno.
export function periodReceiptWhere(
  ctx: ReceiptNumberingContext,
): Prisma.ReceiptWhereInput {
  const samePrefix: Prisma.ReceiptWhereInput = {
    receiptNumber: { startsWith: ctx.config.prefix },
  }

  if (ctx.config.resetMode === "CALENDAR") {
    const year = ctx.issueDate.getUTCFullYear()
    return {
      ...samePrefix,
      issueDate: {
        gte: new Date(Date.UTC(year, 0, 1)),
        lt: new Date(Date.UTC(year + 1, 0, 1)),
      },
    }
  }

  if (ctx.config.resetMode === "ACADEMIC" && ctx.academicYearRange) {
    const { start, nextStart } = ctx.academicYearRange
    return {
      ...samePrefix,
      // Fino all'inizio dell'anno successivo, non fino alla sua fine
      // dichiarata: così luglio e agosto restano nel periodo appena chiuso
      issueDate: nextStart ? { gte: start, lt: nextStart } : { gte: start },
    }
  }

  // Nessun riavvio (o riavvio accademico senza un anno che contenga la
  // data): la serie è unica per prefisso, come prima di queste opzioni
  return samePrefix
}

// Progressivo che verrebbe assegnato adesso, senza scrivere niente:
// serve all'anteprima del PDF e all'anteprima nelle impostazioni.
export async function peekNextSequence(
  ctx: ReceiptNumberingContext,
  client: Client = prisma,
): Promise<number> {
  const highest = await client.receipt.aggregate({
    where: periodReceiptWhere(ctx),
    _max: { sequence: true },
  })
  return nextReceiptSequence(
    counterCandidate(ctx.counter, ctx.period),
    highest._max.sequence ?? 0,
  )
}

// Dati che servono all'anteprima dal vivo nelle impostazioni: il massimo già
// emesso per ciascun tipo di riavvio, così il browser può ricalcolare il
// prossimo numero a ogni cambio di opzione senza tornare al server.
export type NumberingPreviewContext = {
  issueDate: Date
  academicYearLabel: string | null
  storedPeriod: string | null
  maxByResetMode: Record<"NEVER" | "CALENDAR" | "ACADEMIC", number>
}

export async function loadNumberingPreviewContext(
  prefix: string,
  storedPeriod: string | null,
  issueDate: Date = todayInRome(),
): Promise<NumberingPreviewContext> {
  const academicYear = await resolveAcademicYearAt(prisma, issueDate)

  const base = { prefix, yearMode: "NONE" as const, digits: 3 }
  const [never, calendar, academic] = await Promise.all(
    (["NEVER", "CALENDAR", "ACADEMIC"] as const).map(async (resetMode) => {
      const ctx = makeNumberingContext({
        config: { ...base, resetMode },
        issueDate,
        academicYear,
        counter: { number: 0, period: storedPeriod },
      })
      const highest = await prisma.receipt.aggregate({
        where: periodReceiptWhere(ctx),
        _max: { sequence: true },
      })
      return highest._max.sequence ?? 0
    }),
  )

  return {
    issueDate,
    academicYearLabel: academicYear?.label ?? null,
    storedPeriod,
    maxByResetMode: { NEVER: never, CALENDAR: calendar, ACADEMIC: academic },
  }
}

// Assegnazione atomica del progressivo. La UPDATE con CASE prende il lock
// sulla riga del contatore fino al commit e decide in una sola istruzione se
// incrementare o ripartire: due emissioni a cavallo di mezzanotte non possono
// ottenere lo stesso numero né saltarne uno, perché la seconda trova il
// periodo già aggiornato dalla prima.
export async function assignSequence(
  tx: Prisma.TransactionClient,
  ctx: ReceiptNumberingContext,
): Promise<number> {
  const rows = await tx.$queryRaw<{ receipt_number: number }[]>`
    UPDATE receipt_settings
    SET receipt_number = CASE
          WHEN receipt_period = ${ctx.period} THEN receipt_number + 1
          ELSE 1
        END,
        receipt_period = ${ctx.period}
    WHERE id = 1
    RETURNING receipt_number
  `
  const candidate = rows[0]?.receipt_number
  if (candidate === undefined) {
    throw new ReceiptNumberingError(
      "Impostazioni ricevute mancanti: configurale in Impostazioni → Ricevute.",
    )
  }

  // Rete di sicurezza: il contatore non può mai riusare un progressivo già
  // emesso nello stesso periodo, nemmeno subito dopo un cambio di formato
  const highest = await tx.receipt.aggregate({
    where: periodReceiptWhere(ctx),
    _max: { sequence: true },
  })
  const sequence = nextReceiptSequence(candidate, highest._max.sequence ?? 0)

  if (sequence !== candidate) {
    await tx.receiptSettings.update({
      where: { id: 1 },
      data: { receiptNumber: sequence },
    })
  }

  return sequence
}
