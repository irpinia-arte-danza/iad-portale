import { FeeType, Prisma, ScheduleStatus } from "@prisma/client"

function computeFirstDueDate(enrollmentDate: Date, renewalDay: number): Date {
  const y = enrollmentDate.getUTCFullYear()
  const m = enrollmentDate.getUTCMonth()
  const d = enrollmentDate.getUTCDate()

  if (d <= renewalDay) {
    return new Date(Date.UTC(y, m, renewalDay))
  }
  return new Date(Date.UTC(y, m + 1, renewalDay))
}

function advanceOneMonth(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()),
  )
}

// Corsi IAD finiscono a giugno (chiusura estiva lug/ago). L'AcademicYear
// copre un range contabile più ampio (fino 31 agosto) — il "course season
// end" è una policy business separata che NON viene da AY.endDate.
const COURSE_SEASON_END_MONTH = 5 // giugno, 0-based

function parseEndYear(label: string): number | null {
  const parts = label.split("-")
  if (parts.length !== 2) return null
  const y = Number.parseInt(parts[1], 10)
  return Number.isFinite(y) ? y : null
}

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
        select: { id: true, label: true, monthlyRenewalDay: true },
      },
    },
  })

  if (!enrollment) return 0
  if (enrollment.course.monthlyFeeCents <= 0) return 0

  const endYear = parseEndYear(enrollment.academicYear.label)
  if (endYear === null) return 0

  const { enrollmentDate, academicYear, course } = enrollment
  const firstDue = computeFirstDueDate(
    enrollmentDate,
    academicYear.monthlyRenewalDay,
  )

  const rows: Prisma.PaymentScheduleCreateManyInput[] = []
  let current = firstDue
  while (
    current.getUTCFullYear() < endYear ||
    (current.getUTCFullYear() === endYear &&
      current.getUTCMonth() <= COURSE_SEASON_END_MONTH)
  ) {
    rows.push({
      courseEnrollmentId: enrollment.id,
      academicYearId: academicYear.id,
      feeType: FeeType.MONTHLY,
      dueDate: current,
      amountCents: course.monthlyFeeCents,
      status: ScheduleStatus.DUE,
      createdBy,
    })
    current = advanceOneMonth(current)
  }

  if (rows.length === 0) return 0

  const result = await tx.paymentSchedule.createMany({ data: rows })
  return result.count
}
