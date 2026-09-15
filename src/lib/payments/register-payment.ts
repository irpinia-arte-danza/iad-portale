import "server-only"

import {
  AuditAction,
  FeeType,
  PaymentStatus,
  ScheduleStatus,
  type Prisma,
} from "@prisma/client"

import { associationFeeDescription } from "@/lib/fees/association-fee"
import { fiscalYearForDate } from "@/lib/fiscal-years"
import { prisma } from "@/lib/prisma"
import { cancelReceiptForPayment } from "@/lib/receipts/issue-receipt"
import { feeTypeToReceiptCategory } from "@/lib/receipts/numbering"
import type { PaymentCreateValues } from "@/lib/schemas/payment"
import { toDateOnly } from "@/lib/utils/date-only"
import { formatEur } from "@/lib/utils/format"

import { amountDifferences, eurToCents, planCollection } from "./collection-plan"
import {
  SCHEDULE_LINE_SELECT,
  athleteIdOfSchedule,
  compareScheduleLines,
  describeSchedule,
  type ScheduleLine,
} from "./schedule-lines"

// ─────────────────────────────────────────────────────────────────────────
// Registrazione e storno dei pagamenti (senza controllo di ruolo: lo fanno
// le server action che chiamano queste funzioni).
//
// Regole:
// - un pagamento = una consegna di denaro = una ricevuta, anche su più
//   scadenze, tutte della stessa allieva
// - scadenze chiuse tutte nella stessa transazione o nessuna
// - una scadenza pagata da un altro pagamento fa fallire tutto; una
//   segnata come non dovuta nel frattempo viene esclusa con avviso
// - importo per scadenza (collection-plan.ts): una quota incassata per meno
//   del suo importo vale quanto incassato, la scadenza si allinea e risulta
//   pagata senza residuo; con più scadenze il totale è la somma delle righe
//   (righe della ricevuta e ripartizione per tipo quota tornano al centesimo)
// - importo incassato diverso da quello della scadenza → audit del pagamento
// - quote saggio e costumi hanno numerazione ricevute separata: non si uniscono
//   alle quote ordinarie né tra loro
// ─────────────────────────────────────────────────────────────────────────

export type RegisterPaymentResult =
  | { ok: true; paymentId: string; warnings: string[] }
  | { ok: false; error: string }

// Scadenza pagata o segnata come non dovuta da un'altra operazione durante la
// transazione
class ScheduleChangedError extends Error {}

const OPEN_STATUSES: ScheduleStatus[] = [ScheduleStatus.DUE, ScheduleStatus.OVERDUE]

function isOpen(s: ScheduleLine): boolean {
  return OPEN_STATUSES.includes(s.status) && s.paymentId === null
}

function emptyToNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null) return null
  const trimmed = value.trim()
  return trimmed === "" ? null : trimmed
}

function rowAmountsCents(
  amounts: Record<string, number> | undefined,
): Record<string, number> | undefined {
  if (!amounts) return undefined
  return Object.fromEntries(
    Object.entries(amounts).map(([id, eur]) => [id, eurToCents(eur)]),
  )
}

function firstDayOfMonthUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
}

function lastDayOfMonthUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0))
}

export async function registerPaymentCore(
  values: PaymentCreateValues,
  actor: { userId: string },
): Promise<RegisterPaymentResult> {
  const [currentAY, athlete] = await Promise.all([
    prisma.academicYear.findFirst({
      where: { isCurrent: true },
      select: { id: true, label: true },
    }),
    prisma.athlete.findUnique({
      where: { id: values.athleteId, deletedAt: null },
      select: { id: true },
    }),
  ])
  if (!currentAY) {
    return { ok: false, error: "Nessun anno accademico corrente configurato" }
  }
  if (!athlete) return { ok: false, error: "Allieva non trovata" }

  const parentId = emptyToNull(values.parentId)
  if (parentId) {
    const relation = await prisma.athleteParent.findFirst({
      where: { athleteId: athlete.id, parentId, parent: { deletedAt: null } },
      select: { id: true },
    })
    if (!relation) {
      return { ok: false, error: "Pagamento non valido per questa allieva" }
    }
  }

  let scheduleIds = [...new Set(values.paymentScheduleIds)]

  // Quota associativa registrata senza spuntare la scadenza: se quella
  // dell'anno esiste la chiude; se non esiste (allieva non ancora iscritta)
  // il pagamento resta libero e viene abbinato alla prima iscrizione.
  if (scheduleIds.length === 0 && values.feeType === FeeType.ASSOCIATION) {
    const association = await prisma.paymentSchedule.findFirst({
      where: {
        athleteId: athlete.id,
        academicYearId: currentAY.id,
        feeType: FeeType.ASSOCIATION,
      },
      select: { id: true, status: true },
    })
    const label = associationFeeDescription(currentAY.label)
    if (association?.status === ScheduleStatus.PAID) {
      return { ok: false, error: `${label} già pagata per questa allieva` }
    }
    if (association?.status === ScheduleStatus.WAIVED) {
      return {
        ok: false,
        error: `${label} segnata come non dovuta per questa allieva: ripristinala come dovuta dalla scheda allieva prima di registrare il pagamento`,
      }
    }
    if (association) scheduleIds = [association.id]
  }

  const selected =
    scheduleIds.length > 0
      ? await prisma.paymentSchedule.findMany({
          where: { id: { in: scheduleIds } },
          select: SCHEDULE_LINE_SELECT,
        })
      : []

  if (selected.length !== scheduleIds.length) {
    return {
      ok: false,
      error: "Una delle scadenze selezionate non esiste più: ricarica la pagina",
    }
  }
  if (selected.some((s) => athleteIdOfSchedule(s) !== athlete.id)) {
    return {
      ok: false,
      error: "Le scadenze selezionate devono essere tutte dell'allieva del pagamento",
    }
  }

  const alreadyPaid = selected.find(
    (s) => s.status === ScheduleStatus.PAID || s.paymentId !== null,
  )
  if (alreadyPaid) {
    return {
      ok: false,
      error: `«${describeSchedule(alreadyPaid)}» risulta già pagata: nessun pagamento registrato. Ricarica la pagina e controlla le scadenze.`,
    }
  }

  const waived = selected.filter((s) => s.status === ScheduleStatus.WAIVED)
  const open = selected.filter(isOpen).sort(compareScheduleLines)
  if (selected.length > 0 && open.length === 0) {
    return {
      ok: false,
      error: "Le scadenze selezionate risultano non dovute: nessun pagamento registrato",
    }
  }

  if (open.some((s) => s.showcaseParticipation && !s.showcaseParticipation.confirmed)) {
    return {
      ok: false,
      error: "Partecipazione saggio non confermata: conferma prima il piano",
    }
  }

  const categories = new Set(open.map((s) => feeTypeToReceiptCategory(s.feeType)))
  if (categories.size > 1) {
    return {
      ok: false,
      error:
        "Quote saggio e costumi hanno una numerazione ricevute separata: registrale in un pagamento a parte",
    }
  }

  const warnings = waived.map(
    (s) => `«${describeSchedule(s)}» esclusa: risulta non dovuta`,
  )

  // Importo per scadenza: con una scadenza è l'importo del pagamento, con più
  // scadenze quello di ogni riga. Quelle segnate come non dovute nel frattempo
  // escono dal totale.
  const inputCents = eurToCents(values.amountEur)
  const plan = planCollection({
    schedules: selected.map((s) => ({
      id: s.id,
      amountCents: s.amountCents,
      description: describeSchedule(s),
    })),
    totalCents: inputCents,
    rowCents: rowAmountsCents(values.scheduleAmountsEur),
  })
  if (!plan.ok) return { ok: false, error: plan.error }

  const openIds = new Set(open.map((s) => s.id))
  const openRows = plan.rows.filter((r) => openIds.has(r.scheduleId))
  const amountCents =
    selected.length === 0
      ? inputCents
      : openRows.reduce((sum, r) => sum + r.collectedCents, 0)
  if (amountCents !== inputCents) {
    warnings.push(
      `Importo registrato ${formatEur(amountCents)} invece di ${formatEur(inputCents)}`,
    )
  }
  // Quote incassate per meno: la scadenza vale quanto incassato
  const alignments = openRows.filter((r) => r.alignedCents !== r.dueCents)
  const differences = amountDifferences(openRows)

  const feeType = open[0]?.feeType ?? values.feeType
  const enrollmentIds = [
    ...new Set(open.flatMap((s) => (s.courseEnrollmentId ? [s.courseEnrollmentId] : []))),
  ]
  const monthlyDueDates = open
    .filter((s) => s.feeType === FeeType.MONTHLY || s.feeType === FeeType.TRIMESTER)
    .map((s) => new Date(s.dueDate).getTime())
  const stageEnrollmentIds = open.flatMap((s) =>
    s.stageEnrollmentId ? [s.stageEnrollmentId] : [],
  )
  const costumeAssignmentIds = open.flatMap((s) =>
    s.costumeAssignmentId ? [s.costumeAssignmentId] : [],
  )

  try {
    // Anno fiscale dalla data del pagamento, non l'anno "corrente": un
    // pagamento del 28/12 registrato il 3/1 resta nell'anno precedente
    const paymentDate = toDateOnly(values.paymentDate)
    const fiscalYear = await fiscalYearForDate(paymentDate)

    const payment = await prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          athleteId: athlete.id,
          parentId,
          courseEnrollmentId: enrollmentIds.length === 1 ? enrollmentIds[0] : null,
          academicYearId: currentAY.id,
          fiscalYearId: fiscalYear.id,
          feeType,
          amountCents,
          method: values.method,
          status: PaymentStatus.PAID,
          paymentDate,
          periodStart:
            monthlyDueDates.length > 0
              ? firstDayOfMonthUTC(new Date(Math.min(...monthlyDueDates)))
              : null,
          periodEnd:
            monthlyDueDates.length > 0
              ? lastDayOfMonthUTC(new Date(Math.max(...monthlyDueDates)))
              : null,
          notes: emptyToNull(values.notes),
        },
        select: { id: true },
      })

      if (open.length > 0) {
        const closed = await tx.paymentSchedule.updateMany({
          where: {
            id: { in: open.map((s) => s.id) },
            status: { in: OPEN_STATUSES },
            paymentId: null,
          },
          data: { paymentId: created.id, status: ScheduleStatus.PAID },
        })
        if (closed.count !== open.length) throw new ScheduleChangedError()
      }

      for (const row of alignments) {
        const aligned = await tx.paymentSchedule.updateMany({
          where: { id: row.scheduleId, paymentId: created.id },
          data: { amountCents: row.alignedCents },
        })
        if (aligned.count !== 1) throw new ScheduleChangedError()
      }

      // Serve a capire dopo mesi perché quella quota era diversa
      if (differences.length > 0) {
        await tx.auditLog.create({
          data: {
            userId: actor.userId,
            action: AuditAction.CREATE,
            entityType: "Payment",
            entityId: created.id,
            changes: {
              amountDifferences: differences.map((r) => ({
                scheduleId: r.scheduleId,
                schedule: r.description,
                dueCents: r.dueCents,
                collectedCents: r.collectedCents,
                scheduleAmountAfterCents: r.alignedCents,
              })),
              notes: emptyToNull(values.notes),
            },
          },
        })
      }

      if (stageEnrollmentIds.length > 0) {
        const marked = await tx.stageEnrollment.updateMany({
          where: { id: { in: stageEnrollmentIds }, paid: false },
          data: { paid: true, paymentId: created.id },
        })
        if (marked.count !== stageEnrollmentIds.length) {
          throw new ScheduleChangedError()
        }
      }

      if (costumeAssignmentIds.length > 0) {
        const marked = await tx.costumeAssignment.updateMany({
          where: { id: { in: costumeAssignmentIds }, paid: false },
          data: { paid: true, paymentId: created.id },
        })
        if (marked.count !== costumeAssignmentIds.length) {
          throw new ScheduleChangedError()
        }
      }

      return created
    })

    return { ok: true, paymentId: payment.id, warnings }
  } catch (error) {
    if (error instanceof ScheduleChangedError) {
      return {
        ok: false,
        error:
          "Una delle scadenze è stata pagata o segnata come non dovuta mentre registravi: nessun pagamento registrato. Ricarica la pagina.",
      }
    }
    throw error
  }
}

// Riapre tutte le scadenze e le iscrizioni chiuse da un pagamento (storno o
// eliminazione). Restituisce il numero di scadenze riaperte.
export async function releasePaymentLinks(
  tx: Prisma.TransactionClient,
  paymentId: string,
): Promise<number> {
  const reopened = await tx.paymentSchedule.updateMany({
    where: { paymentId },
    data: { paymentId: null, status: ScheduleStatus.DUE },
  })
  await tx.stageEnrollment.updateMany({
    where: { paymentId },
    data: { paid: false, paymentId: null },
  })
  await tx.costumeAssignment.updateMany({
    where: { paymentId },
    data: { paid: false, paymentId: null },
  })
  return reopened.count
}

export type ReversePaymentResult =
  | {
      ok: true
      athleteId: string
      cancelledReceiptNumber: string | null
      reopenedSchedules: string[]
    }
  | { ok: false; error: string }

export async function reversePaymentCore(params: {
  paymentId: string
  userId: string
  reason: string
}): Promise<ReversePaymentResult> {
  const existing = await prisma.payment.findFirst({
    where: { id: params.paymentId, deletedAt: null },
    select: {
      athleteId: true,
      status: true,
      paymentSchedules: { select: SCHEDULE_LINE_SELECT },
    },
  })
  if (!existing) return { ok: false, error: "Pagamento non trovato" }
  if (existing.status === PaymentStatus.REVERSED) {
    return { ok: false, error: "Pagamento già stornato" }
  }

  const reopenedSchedules = [...existing.paymentSchedules]
    .sort(compareScheduleLines)
    .map(describeSchedule)

  const cancelledReceiptNumber = await prisma.$transaction(async (tx) => {
    // Tutte le scadenze del pagamento tornano da pagare
    await releasePaymentLinks(tx, params.paymentId)

    await tx.payment.update({
      where: { id: params.paymentId },
      data: {
        status: PaymentStatus.REVERSED,
        reversalReason: params.reason,
      },
    })

    // Ricevuta emessa → annullata, con numero e data di emissione invariati
    const cancelled = await cancelReceiptForPayment(tx, {
      paymentId: params.paymentId,
      userId: params.userId,
      reason: params.reason,
    })

    await tx.auditLog.create({
      data: {
        userId: params.userId,
        action: AuditAction.REVERSE_PAYMENT,
        entityType: "Payment",
        entityId: params.paymentId,
        changes: {
          reason: params.reason,
          cancelledReceiptNumber: cancelled,
          reopenedSchedules,
        },
      },
    })

    return cancelled
  })

  return {
    ok: true,
    athleteId: existing.athleteId,
    cancelledReceiptNumber,
    reopenedSchedules,
  }
}
