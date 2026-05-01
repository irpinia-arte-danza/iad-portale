import type { Prisma } from "@prisma/client"

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
