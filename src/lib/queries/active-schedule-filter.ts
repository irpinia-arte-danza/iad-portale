import type { Prisma } from "@prisma/client"

// Sprint 6.A — PaymentSchedule è ora polimorfico:
//   • courseEnrollmentId valorizzato → scadenza corso (mensile/trimestrale)
//   • stageEnrollmentId valorizzato → scadenza stage
// activeScheduleFilter (default) tiene solo scadenze di tipo corso
// con allieva/corso attivi. Per filtri che includono stage usare
// withActiveCourseOrStageScheduleFilter.

export const activeScheduleFilter = {
  courseEnrollment: {
    withdrawalDate: null,
    athlete: { deletedAt: null },
    course: { deletedAt: null },
  },
} as const satisfies Prisma.PaymentScheduleWhereInput

export function withActiveScheduleFilter(
  where: Prisma.PaymentScheduleWhereInput,
): Prisma.PaymentScheduleWhereInput {
  const existingEnrollmentFilter = where.courseEnrollment as
    | Prisma.CourseEnrollmentWhereInput
    | undefined

  return {
    ...where,
    courseEnrollment: existingEnrollmentFilter
      ? {
          AND: [activeScheduleFilter.courseEnrollment, existingEnrollmentFilter],
        }
      : activeScheduleFilter.courseEnrollment,
  }
}

// Scadenza valida per gli scopi del parent portal / dashboard:
// corso attivo OPPURE stage attivo (non soft-deleted) con allieva attiva.
export function withActiveCourseOrStageScheduleFilter(
  where: Prisma.PaymentScheduleWhereInput,
): Prisma.PaymentScheduleWhereInput {
  return {
    ...where,
    OR: [
      {
        courseEnrollment: {
          withdrawalDate: null,
          athlete: { deletedAt: null },
          course: { deletedAt: null },
        },
      },
      {
        stageEnrollment: {
          athlete: { deletedAt: null },
          stage: { deletedAt: null },
        },
      },
    ],
  }
}
