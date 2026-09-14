import "server-only"

import { AuditAction, Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { fiscalYearOf, isNextFiscalYearDue } from "@/lib/school-calendar"
import { dateOnly } from "@/lib/utils/date-only"

// L'anno fiscale di pagamenti e spese è l'anno solare della loro data, non
// l'anno "corrente": un pagamento del 28/12 registrato il 3/1 resta
// nell'anno precedente. Se l'anno non esiste ancora viene creato qui.

const FISCAL_YEAR_SELECT = {
  id: true,
  year: true,
  isCurrent: true,
} satisfies Prisma.FiscalYearSelect

type FiscalYearRef = Prisma.FiscalYearGetPayload<{
  select: typeof FISCAL_YEAR_SELECT
}>

async function findOrCreateFiscalYear(
  year: number,
): Promise<{ fiscalYear: FiscalYearRef; created: boolean }> {
  const existing = await prisma.fiscalYear.findUnique({
    where: { year },
    select: FISCAL_YEAR_SELECT,
  })
  if (existing) return { fiscalYear: existing, created: false }

  try {
    const fiscalYear = await prisma.fiscalYear.create({
      data: {
        year,
        startDate: dateOnly(year, 0, 1),
        endDate: dateOnly(year, 11, 31),
      },
      select: FISCAL_YEAR_SELECT,
    })
    return { fiscalYear, created: true }
  } catch (error) {
    // Creato nel frattempo da un'altra richiesta
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const fiscalYear = await prisma.fiscalYear.findUniqueOrThrow({
        where: { year },
        select: FISCAL_YEAR_SELECT,
      })
      return { fiscalYear, created: false }
    }
    throw error
  }
}

// `date` deve essere già un giorno di calendario (toDateOnly)
export async function fiscalYearForDate(date: Date): Promise<FiscalYearRef> {
  const { fiscalYear } = await findOrCreateFiscalYear(fiscalYearOf(date))
  return fiscalYear
}

export type FiscalYearSyncResult = {
  action: "synced"
  current: number
  created: number[]
  switchedCurrent: boolean
  previousCurrent: number[]
}

// Cron notturno: crea l'anno fiscale in corso (a dicembre anche il
// successivo) e dal 1° gennaio lo imposta come corrente.
export async function syncFiscalYears(
  today: Date,
  actorId: string | null,
): Promise<FiscalYearSyncResult> {
  const year = fiscalYearOf(today)
  const { fiscalYear: current, created: currentCreated } =
    await findOrCreateFiscalYear(year)
  const created = currentCreated ? [year] : []

  if (isNextFiscalYearDue(today)) {
    const next = await findOrCreateFiscalYear(year + 1)
    if (next.created) created.push(year + 1)
  }

  if (created.length > 0) {
    await prisma.auditLog.create({
      data: {
        userId: actorId,
        action: AuditAction.CREATE,
        entityType: "FiscalYear",
        entityId: null,
        changes: { action: "auto-create", years: created },
      },
    })
  }

  const staleCurrent = await prisma.fiscalYear.findMany({
    where: { isCurrent: true, NOT: { id: current.id } },
    select: { year: true },
  })
  const previousCurrent = staleCurrent.map((f) => f.year)
  const switchedCurrent = !current.isCurrent || previousCurrent.length > 0

  if (switchedCurrent) {
    await prisma.$transaction([
      prisma.fiscalYear.updateMany({
        where: { isCurrent: true, NOT: { id: current.id } },
        data: { isCurrent: false },
      }),
      prisma.fiscalYear.update({
        where: { id: current.id },
        data: { isCurrent: true },
      }),
      prisma.auditLog.create({
        data: {
          userId: actorId,
          action: AuditAction.UPDATE,
          entityType: "FiscalYear",
          entityId: current.id,
          changes: { action: "auto-set-current", year, previousCurrent },
        },
      }),
    ])
  }

  return {
    action: "synced",
    current: year,
    created,
    switchedCurrent,
    previousCurrent,
  }
}
