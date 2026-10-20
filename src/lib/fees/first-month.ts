// Solo il tipo: il modulo gira anche nel browser (dialog di iscrizione)
import type { ScheduleStatus } from "@prisma/client"

// ─────────────────────────────────────────────────────────────────────────
// La rata del mese di iscrizione, per chi entra a mese inoltrato.
//
// Chi si iscrive il 28 settembre si trovava la rata di settembre intera,
// e da ottobre in ritardo. Se l'iscrizione è dopo il giorno 15, il dialog
// chiede cosa fare di quel mese: dovuto intero (com'era, e resta il default:
// l'importo vero Giuseppina lo decide all'incasso), dovuto ridotto, oppure
// non dovuto (rata creata già WAIVED, con il motivo). Le altre rate non
// cambiano. Funzioni pure, usate dal dialog e dal generatore delle rate.
// ─────────────────────────────────────────────────────────────────────────

// Dal 16 in poi si chiede
export const LATE_ENROLLMENT_AFTER_DAY = 15

export const FIRST_MONTH_CHOICES = ["FULL", "REDUCED", "WAIVED"] as const
export type FirstMonthChoiceKind = (typeof FIRST_MONTH_CHOICES)[number]

export type FirstMonthChoice =
  | { kind: "FULL" }
  | { kind: "REDUCED"; amountCents: number }
  | { kind: "WAIVED" }

function sameMonth(a: Date, b: Date): boolean {
  return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth()
}

// La scelta ha senso se l'iscrizione è dopo il 15 E la prima rata è proprio
// quella del mese di iscrizione (chi si iscrive ad agosto, prima dell'inizio
// dell'anno, comincia da settembre e non ha un mese a metà).
// Date di calendario (mezzanotte UTC).
export function needsFirstMonthChoice(
  enrollmentDate: Date,
  firstDueDate: Date | null,
): boolean {
  if (!firstDueDate) return false
  if (enrollmentDate.getUTCDate() <= LATE_ENROLLMENT_AFTER_DAY) return false
  return sameMonth(enrollmentDate, firstDueDate)
}

// "iscrizione del 28/09/2026": il motivo che si legge nella rata non dovuta
export function firstMonthWaiverReason(enrollmentDate: Date): string {
  const d = String(enrollmentDate.getUTCDate()).padStart(2, "0")
  const m = String(enrollmentDate.getUTCMonth() + 1).padStart(2, "0")
  return `iscrizione del ${d}/${m}/${enrollmentDate.getUTCFullYear()}`
}

export type MonthlyScheduleDraft = {
  dueDate: Date
  amountCents: number
  status: ScheduleStatus
  waiverReason: string | null
}

// Le rate dell'iscrizione con la scelta applicata alla prima. Senza scelta,
// o se la scelta non si applica (iscrizione entro il 15), tutte DUE a
// importo pieno come sempre.
export function applyFirstMonthChoice(params: {
  enrollmentDate: Date
  dueDates: Date[]
  monthlyFeeCents: number
  choice: FirstMonthChoice | null | undefined
}): MonthlyScheduleDraft[] {
  const { enrollmentDate, dueDates, monthlyFeeCents, choice } = params
  const applies = choice && needsFirstMonthChoice(enrollmentDate, dueDates[0] ?? null)

  return dueDates.map((dueDate, index) => {
    const base: MonthlyScheduleDraft = {
      dueDate,
      amountCents: monthlyFeeCents,
      status: "DUE",
      waiverReason: null,
    }
    if (index !== 0 || !applies) return base
    if (choice.kind === "WAIVED") {
      return {
        ...base,
        status: "WAIVED",
        waiverReason: firstMonthWaiverReason(enrollmentDate),
      }
    }
    if (choice.kind === "REDUCED") {
      return { ...base, amountCents: choice.amountCents }
    }
    return base
  })
}
