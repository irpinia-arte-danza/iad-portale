import "server-only"

import { FeeType, Prisma, ScheduleStatus } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { logError } from "@/lib/logging/log-error"
import { GENERIC_ERROR_MESSAGE } from "@/lib/errors"

// Iscrizione di un'allieva a uno stage (+ scadenza di pagamento + audit),
// condivisa da:
// - admin: enrollAthlete / enrollAthletesBulk in src/app/(admin)/admin/stages/actions.ts
// - genitori: parentEnrollAthletesInStage in src/app/(parent)/parent/_actions/stage-actions.ts
//
// Modulo interno, NON server action: accetta enrolledByUserId e auditUserId
// dal chiamante. Esposta come endpoint permetterebbe di iscrivere qualsiasi
// allieva e di falsificare l'autore nell'audit log. Autenticazione, ruolo e
// ownership delle allieve restano responsabilità delle action chiamanti,
// che devono passare l'utente della sessione.

export type EnrollAthleteCoreParams = {
  stageId: string
  athleteId: string
  notes: string | null
  enrolledByUserId: string | null
  auditUserId: string | null
}

export type EnrollAthleteCoreResult =
  | { ok: true; enrollmentId: string }
  | { ok: false; error: string }

function startOfUTCToday(): Date {
  const now = new Date()
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  )
}

function startOfUTCDate(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  )
}

// dueDate = max(today, min(stage.date - 7gg, registrationDeadline))
function computeScheduleDueDate(
  stageDate: Date,
  registrationDeadline: Date | null | undefined,
): Date {
  const stageMid = startOfUTCDate(stageDate)
  const minusSeven = new Date(stageMid)
  minusSeven.setUTCDate(minusSeven.getUTCDate() - 7)

  let candidate = minusSeven
  if (registrationDeadline) {
    const reg = startOfUTCDate(registrationDeadline)
    if (reg < candidate) candidate = reg
  }

  const today = startOfUTCToday()
  if (candidate < today) candidate = today
  return candidate
}

function mapPrismaError(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return "Iscrizione duplicata"
    if (error.code === "P2003") return "Riferimento a record inesistente"
    if (error.code === "P2025") return "Risorsa non trovata"
  }
  logError("[stage enroll] unexpected error", error)
  return GENERIC_ERROR_MESSAGE
}

export async function enrollAthleteCore(
  params: EnrollAthleteCoreParams,
): Promise<EnrollAthleteCoreResult> {
  // 1) Stage valido + iscrizioni aperte
  const stage = await prisma.stage.findFirst({
    where: { id: params.stageId, deletedAt: null },
    select: {
      id: true,
      title: true,
      date: true,
      feeCents: true,
      capacity: true,
      registrationOpen: true,
      registrationDeadline: true,
      academicYearId: true,
      _count: { select: { enrollments: true } },
    },
  })
  if (!stage) return { ok: false, error: "Stage non trovato" }
  if (!stage.registrationOpen) {
    return { ok: false, error: "Iscrizioni chiuse per questo stage" }
  }

  const today = startOfUTCToday()
  const stageMid = startOfUTCDate(stage.date)
  if (stageMid < today) {
    return { ok: false, error: "Stage già concluso" }
  }
  if (stage.registrationDeadline) {
    const deadline = startOfUTCDate(stage.registrationDeadline)
    if (deadline < today) {
      return { ok: false, error: "Scadenza iscrizioni superata" }
    }
  }
  // Controllo rapido fuori transazione: quello che conta è dentro (sotto)
  if (stage._count.enrollments >= stage.capacity) {
    return { ok: false, error: "Posti esauriti" }
  }

  // 2) Atleta attiva
  const athlete = await prisma.athlete.findFirst({
    where: { id: params.athleteId, deletedAt: null },
    select: { id: true },
  })
  if (!athlete) return { ok: false, error: "Allieva non trovata" }

  // 3) Non già iscritta
  const existing = await prisma.stageEnrollment.findUnique({
    where: {
      stageId_athleteId: {
        stageId: params.stageId,
        athleteId: params.athleteId,
      },
    },
    select: { id: true },
  })
  if (existing) return { ok: false, error: "Allieva già iscritta a questo stage" }

  const dueDate = computeScheduleDueDate(stage.date, stage.registrationDeadline)

  // Capienza e doppione si decidono DENTRO la transazione, serializable:
  // due iscrizioni insieme sull'ultimo posto non possono passare entrambe.
  // Se Postgres rifiuta la seconda per conflitto (P2034) si riprova da capo
  // qualche volta; la rilettura trova il posto occupato e dice «esauriti».
  for (let attempt = 1; ; attempt++) {
    try {
      const created = await runEnrollment(stage, params, dueDate)
      return { ok: true, enrollmentId: created.id }
    } catch (error) {
      if (error instanceof EnrollRefused) return { ok: false, error: error.message }
      if (isSerializationConflict(error) && attempt < MAX_ENROLL_TRIES) continue
      return { ok: false, error: mapPrismaError(error) }
    }
  }
}

// Un rifiuto deciso dentro la transazione (posti finiti, già iscritta): non
// è un errore tecnico e non si riprova
class EnrollRefused extends Error {}

export const MAX_ENROLL_TRIES = 3

// P2034: «Transaction failed due to a write conflict or a deadlock», è come
// Prisma riporta il serialization_failure di Postgres
export function isSerializationConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034"
  )
}

type EnrollableStage = {
  id: string
  title: string
  capacity: number
  feeCents: number
  academicYearId: string
}

async function runEnrollment(
  stage: EnrollableStage,
  params: EnrollAthleteCoreParams,
  dueDate: Date,
): Promise<{ id: string }> {
  return prisma.$transaction(
    async (tx) => {
      const taken = await tx.stageEnrollment.count({
        where: { stageId: params.stageId },
      })
      if (taken >= stage.capacity) throw new EnrollRefused("Posti esauriti")
      const duplicate = await tx.stageEnrollment.findUnique({
        where: {
          stageId_athleteId: {
            stageId: params.stageId,
            athleteId: params.athleteId,
          },
        },
        select: { id: true },
      })
      if (duplicate) {
        throw new EnrollRefused("Allieva già iscritta a questo stage")
      }

      const enrollment = await tx.stageEnrollment.create({
        data: {
          stageId: params.stageId,
          athleteId: params.athleteId,
          enrolledBy: params.enrolledByUserId,
          notes: params.notes,
        },
        select: { id: true },
      })

      if (stage.feeCents > 0) {
        await tx.paymentSchedule.create({
          data: {
            stageEnrollmentId: enrollment.id,
            academicYearId: stage.academicYearId,
            feeType: FeeType.STAGE,
            dueDate,
            amountCents: stage.feeCents,
            status: ScheduleStatus.DUE,
            createdBy: params.auditUserId ?? undefined,
            notes: `Stage: ${stage.title}`,
          },
        })
      }

      if (params.auditUserId) {
        await tx.auditLog.create({
          data: {
            userId: params.auditUserId,
            action: "STAGE_ENROLLMENT_CREATE",
            entityType: "StageEnrollment",
            entityId: enrollment.id,
            changes: {
              stageId: params.stageId,
              athleteId: params.athleteId,
            } satisfies Prisma.InputJsonValue,
          },
        })
      }

      return enrollment
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  )
}
