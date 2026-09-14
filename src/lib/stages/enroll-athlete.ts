import "server-only"

import { FeeType, Prisma, ScheduleStatus } from "@prisma/client"

import { prisma } from "@/lib/prisma"

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
  console.error("[stage enroll] unexpected error", error)
  return "Errore interno, riprova"
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

  try {
    const created = await prisma.$transaction(async (tx) => {
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
    })

    return { ok: true, enrollmentId: created.id }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}
