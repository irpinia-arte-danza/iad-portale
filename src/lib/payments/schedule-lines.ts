import type { FeeType, Prisma } from "@prisma/client"

import { associationFeeDescription } from "@/lib/fees/association-fee-label"
import { FEE_TYPE_LABELS } from "@/lib/schemas/payment"
import { formatMeseIt } from "@/lib/utils/format"

// ─────────────────────────────────────────────────────────────────────────
// Righe di un pagamento: le scadenze che chiude. Un pagamento = una consegna
// di denaro = una ricevuta, anche quando copre più scadenze della stessa
// allieva (es. quota associativa + prima mensile). Funzioni pure, usate da
// server e client.
// ─────────────────────────────────────────────────────────────────────────

export const SCHEDULE_LINE_SELECT = {
  id: true,
  feeType: true,
  amountCents: true,
  dueDate: true,
  status: true,
  notes: true,
  paymentId: true,
  athleteId: true,
  courseEnrollmentId: true,
  stageEnrollmentId: true,
  costumeAssignmentId: true,
  // Serve alla dicitura del contributo di iscrizione ("… 2026/2027")
  academicYear: { select: { label: true } },
  courseEnrollment: {
    select: { athleteId: true, course: { select: { name: true } } },
  },
  stageEnrollment: {
    select: {
      athleteId: true,
      stage: { select: { id: true, title: true, date: true } },
    },
  },
  showcaseParticipation: {
    select: {
      athleteId: true,
      confirmed: true,
      showcase: { select: { id: true, title: true } },
    },
  },
  costumeAssignment: {
    select: {
      size: true,
      costume: { select: { name: true, showcaseId: true } },
      participation: { select: { athleteId: true } },
    },
  },
} satisfies Prisma.PaymentScheduleSelect

export type ScheduleLine = Prisma.PaymentScheduleGetPayload<{
  select: typeof SCHEDULE_LINE_SELECT
}>

// Colonne @db.Date: giorno UTC
function formatDateIt(date: Date): string {
  const d = new Date(date)
  const dd = String(d.getUTCDate()).padStart(2, "0")
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0")
  return `${dd}/${mm}/${d.getUTCFullYear()}`
}

// Descrizione per la famiglia: righe della ricevuta, PDF, portale genitori.
// Senza nome del corso — sulla ricevuta la famiglia non lo vuole, e il mese
// con l'anno basta a distinguere le rate. Per il gestionale, dove Giuseppina
// deve riconoscere due rate dello stesso mese di un'allieva iscritta a due
// corsi, c'è describeScheduleAdmin.
export function describeSchedule(s: ScheduleLine): string {
  switch (s.feeType) {
    // Le note storiche ("Quota associativa 2026/2027") non si leggono più: la
    // dicitura si calcola sempre dall'anno accademico, così le scadenze già
    // create parlano come quelle nuove senza toccare il database.
    case "ASSOCIATION":
      return associationFeeDescription(s.academicYear.label)
    case "MONTHLY": {
      // formatMeseIt dà mese e anno: "settembre 2026"
      const month = formatMeseIt(new Date(s.dueDate)).toLowerCase()
      return `Contributo mensile di ${month}`
    }
    case "TRIMESTER":
      return FEE_TYPE_LABELS.TRIMESTER
    case "STAGE":
      return s.stageEnrollment
        ? `Iscrizione Stage «${s.stageEnrollment.stage.title}» del ${formatDateIt(s.stageEnrollment.stage.date)}`
        : FEE_TYPE_LABELS.STAGE
    case "SHOWCASE_1":
    case "SHOWCASE_2": {
      if (s.notes) return s.notes
      const kind = s.feeType === "SHOWCASE_1" ? "Caparra" : "Saldo"
      return s.showcaseParticipation
        ? `Saggio «${s.showcaseParticipation.showcase.title}» — ${kind}`
        : FEE_TYPE_LABELS[s.feeType]
    }
    case "COSTUME": {
      if (s.notes) return s.notes
      if (!s.costumeAssignment) return FEE_TYPE_LABELS.COSTUME
      const size = s.costumeAssignment.size
        ? ` · taglia ${s.costumeAssignment.size}`
        : ""
      return `Costume «${s.costumeAssignment.costume.name}»${size}`
    }
    default:
      return s.notes ?? FEE_TYPE_LABELS[s.feeType]
  }
}

// Corso della scadenza, quando c'è (mensili e trimestrali)
export function scheduleCourseName(s: ScheduleLine): string | null {
  return s.courseEnrollment?.course.name ?? null
}

// Descrizione per il gestionale: quella della famiglia più il corso. Vive solo
// nelle pagine /admin e negli audit; ricevute, PDF e portale genitori usano
// describeSchedule (schedule-lines.test.ts controlla che resti così).
export function describeScheduleAdmin(s: ScheduleLine): string {
  const description = describeSchedule(s)
  const course = scheduleCourseName(s)
  return course ? `${description} — ${course}` : description
}

export function athleteIdOfSchedule(s: ScheduleLine): string | null {
  return (
    s.athleteId ??
    s.courseEnrollment?.athleteId ??
    s.stageEnrollment?.athleteId ??
    s.showcaseParticipation?.athleteId ??
    s.costumeAssignment?.participation.athleteId ??
    null
  )
}

// Pagina admin da cui gestire la scadenza
export function scheduleAdminHref(s: ScheduleLine, athleteId: string): string {
  if (s.stageEnrollment) return `/admin/stages/${s.stageEnrollment.stage.id}`
  if (s.showcaseParticipation) {
    return `/admin/showcase/${s.showcaseParticipation.showcase.id}`
  }
  if (s.costumeAssignment) {
    return `/admin/showcase/${s.costumeAssignment.costume.showcaseId}`
  }
  return `/admin/athletes/${athleteId}`
}

const FEE_TYPE_ORDER: FeeType[] = [
  "ASSOCIATION",
  "MONTHLY",
  "TRIMESTER",
  "STAGE",
  "SHOWCASE_1",
  "SHOWCASE_2",
  "COSTUME",
  "TRIAL_LESSON",
  "OTHER",
]

// Ordine delle righe: quota associativa, mensili per data, poi eventi.
// La prima riga dà il tipo quota del pagamento.
export function compareScheduleLines(
  a: { feeType: FeeType; dueDate: Date },
  b: { feeType: FeeType; dueDate: Date },
): number {
  const byType = FEE_TYPE_ORDER.indexOf(a.feeType) - FEE_TYPE_ORDER.indexOf(b.feeType)
  if (byType !== 0) return byType
  return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
}

export const ACCOUNTING_SCHEDULE_SELECT = {
  feeType: true,
  amountCents: true,
} satisfies Prisma.PaymentScheduleSelect

type PaymentForAccounting = {
  feeType: FeeType
  amountCents: number
  paymentSchedules: { feeType: FeeType; amountCents: number }[]
}

// Ripartizione per tipo quota (bilancio, corrispettivi): un pagamento che
// chiude più scadenze conta per ciascuna col suo importo. In registrazione la
// somma deve coincidere con l'importo; se un dato non coincide, vale il tipo
// del pagamento.
export function accountingLines(
  payment: PaymentForAccounting,
): { feeType: FeeType; amountCents: number }[] {
  const schedules = payment.paymentSchedules
  const total = schedules.reduce((sum, s) => sum + s.amountCents, 0)
  if (schedules.length >= 2 && total === payment.amountCents) {
    return schedules.map((s) => ({ feeType: s.feeType, amountCents: s.amountCents }))
  }
  return [{ feeType: payment.feeType, amountCents: payment.amountCents }]
}

// "Contributo di iscrizione + Contributo mensile"
export function paymentFeeTypeLabel(payment: PaymentForAccounting): string {
  const types = [...new Set(accountingLines(payment).map((l) => l.feeType))]
  types.sort((a, b) => FEE_TYPE_ORDER.indexOf(a) - FEE_TYPE_ORDER.indexOf(b))
  return types.map((t) => FEE_TYPE_LABELS[t]).join(" + ")
}
