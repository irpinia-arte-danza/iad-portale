import { monthlyDueDates } from "./monthly-due-dates"

// ─────────────────────────────────────────────────────────────────────────
// Anteprima di un'iscrizione a un corso: cosa verrà generato prima di
// confermare. Stesse regole di generateMonthlySchedulesForEnrollment e
// ensureAssociationFeeSchedule. Funzione pura, usata dal dialog.
// ─────────────────────────────────────────────────────────────────────────

export type EnrollmentPreview = {
  // null: nessuna rata mensile (corso a 0 € o data oltre la fine dei corsi)
  monthly: {
    count: number
    amountCents: number
    firstDueDate: Date
    lastDueDate: Date
  } | null
  // Corso con quota mensile a 0: l'iscrizione non genera rate
  zeroFeeCourse: boolean
  association:
    | { kind: "new"; amountCents: number; dueDate: Date }
    // L'allieva ha già la quota dell'anno (secondo corso)
    | { kind: "existing" }
    // Importo dell'anno non impostato: l'iscrizione verrà rifiutata
    | { kind: "not-set" }
}

export function enrollmentPreview(params: {
  // Data di calendario (mezzanotte UTC)
  enrollmentDate: Date
  monthlyFeeCents: number
  academicYear: {
    startDate: Date
    label: string
    monthlyRenewalDay: number
    associationFeeCents: number
  }
  hasAssociationFee: boolean
}): EnrollmentPreview {
  const { academicYear } = params
  const zeroFeeCourse = params.monthlyFeeCents <= 0

  const dueDates = zeroFeeCourse
    ? []
    : monthlyDueDates({
        enrollmentDate: params.enrollmentDate,
        academicYearStart: academicYear.startDate,
        academicYearLabel: academicYear.label,
        renewalDay: academicYear.monthlyRenewalDay,
      })

  const monthly =
    dueDates.length > 0
      ? {
          count: dueDates.length,
          amountCents: params.monthlyFeeCents,
          firstDueDate: dueDates[0],
          lastDueDate: dueDates[dueDates.length - 1],
        }
      : null

  const association: EnrollmentPreview["association"] = params.hasAssociationFee
    ? { kind: "existing" }
    : academicYear.associationFeeCents <= 0
      ? { kind: "not-set" }
      : {
          kind: "new",
          amountCents: academicYear.associationFeeCents,
          dueDate: params.enrollmentDate,
        }

  return { monthly, zeroFeeCourse, association }
}
