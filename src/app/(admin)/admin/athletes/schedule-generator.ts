import { FeeType, type Prisma } from "@prisma/client"

import { applyFirstMonthChoice, type FirstMonthChoice } from "@/lib/fees/first-month"
import { monthlyDueDates } from "@/lib/fees/monthly-due-dates"

// Rate mensili di una nuova iscrizione: una per mese, dal mese di iscrizione
// a giugno, a importo pieno. Regole delle date in
// src/lib/fees/monthly-due-dates.ts. Per chi si iscrive dopo il 15 la prima
// può essere ridotta o non dovuta (firstMonth, src/lib/fees/first-month.ts).
export async function generateMonthlySchedulesForEnrollment(
  tx: Prisma.TransactionClient,
  enrollmentId: string,
  createdBy: string | null,
  firstMonth?: FirstMonthChoice | null,
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
    data: applyFirstMonthChoice({
      enrollmentDate: enrollment.enrollmentDate,
      dueDates,
      monthlyFeeCents: course.monthlyFeeCents,
      choice: firstMonth,
    }).map((draft) => ({
      courseEnrollmentId: enrollment.id,
      academicYearId: academicYear.id,
      feeType: FeeType.MONTHLY,
      dueDate: draft.dueDate,
      amountCents: draft.amountCents,
      status: draft.status,
      waiverReason: draft.waiverReason,
      createdBy,
    })),
  })
  return result.count
}
