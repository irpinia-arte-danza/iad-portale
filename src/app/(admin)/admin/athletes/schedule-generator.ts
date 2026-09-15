import { FeeType, ScheduleStatus, type Prisma } from "@prisma/client"

import { monthlyDueDates } from "@/lib/fees/monthly-due-dates"

// Rate mensili di una nuova iscrizione: una per mese, dal mese di iscrizione
// a giugno, a importo pieno. Regole delle date in
// src/lib/fees/monthly-due-dates.ts.
export async function generateMonthlySchedulesForEnrollment(
  tx: Prisma.TransactionClient,
  enrollmentId: string,
  createdBy: string | null,
): Promise<number> {
  const enrollment = await tx.courseEnrollment.findUnique({
    where: { id: enrollmentId },
    select: {
      id: true,
      enrollmentDate: true,
      course: { select: { monthlyFeeCents: true } },
      academicYear: {
        select: {
          id: true,
          label: true,
          startDate: true,
          monthlyRenewalDay: true,
        },
      },
    },
  })

  if (!enrollment) return 0
  if (enrollment.course.monthlyFeeCents <= 0) return 0

  const { academicYear, course } = enrollment
  const dueDates = monthlyDueDates({
    enrollmentDate: enrollment.enrollmentDate,
    academicYearStart: academicYear.startDate,
    academicYearLabel: academicYear.label,
    renewalDay: academicYear.monthlyRenewalDay,
  })
  if (dueDates.length === 0) return 0

  const result = await tx.paymentSchedule.createMany({
    data: dueDates.map((dueDate) => ({
      courseEnrollmentId: enrollment.id,
      academicYearId: academicYear.id,
      feeType: FeeType.MONTHLY,
      dueDate,
      amountCents: course.monthlyFeeCents,
      status: ScheduleStatus.DUE,
      createdBy,
    })),
  })
  return result.count
}
