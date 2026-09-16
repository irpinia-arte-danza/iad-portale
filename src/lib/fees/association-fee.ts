import "server-only"

import {
  AuditAction,
  FeeType,
  PaymentStatus,
  ScheduleStatus,
  type Prisma,
} from "@prisma/client"

// ─────────────────────────────────────────────────────────────────────────
// Quota associativa annuale (tesseramento + assicurazione).
//
// Regole (regolamento, punti 1 e 7):
// - una quota per allieva per anno accademico, qualunque sia il numero di corsi
// - nasce con la prima iscrizione a un corso dell'anno e scade quel giorno
// - importo pieno anche a metà anno, non rimborsabile
// - l'importo è quello dell'anno accademico (Anni accademici), mai a zero
// ─────────────────────────────────────────────────────────────────────────

// Le diciture vivono in association-fee-label.ts (funzioni pure, importabili
// anche dai componenti client); qui si ri-esportano per i chiamanti server.
import {
  academicYearSlashLabel,
  associationFeeDescription,
} from "./association-fee-label"

export { academicYearSlashLabel, associationFeeDescription }

export class AssociationFeeNotSetError extends Error {
  constructor(academicYearLabel: string) {
    super(
      `Contributo di iscrizione ${academicYearSlashLabel(academicYearLabel)} non impostato: inseriscilo in Anni accademici prima di iscrivere l'allieva.`,
    )
    this.name = "AssociationFeeNotSetError"
  }
}

// Crea la quota dell'anno se l'allieva non ce l'ha ancora. Da chiamare nella
// transazione dell'iscrizione: se l'importo non è impostato lancia
// AssociationFeeNotSetError e l'iscrizione viene annullata.
export async function ensureAssociationFeeSchedule(
  tx: Prisma.TransactionClient,
  params: {
    athleteId: string
    academicYear: { id: string; label: string; associationFeeCents: number }
    dueDate: Date
    createdBy: string | null
  },
): Promise<"created" | "existing"> {
  const { athleteId, academicYear } = params

  const existing = await tx.paymentSchedule.findFirst({
    where: {
      athleteId,
      academicYearId: academicYear.id,
      feeType: FeeType.ASSOCIATION,
    },
    select: { id: true },
  })
  if (existing) return "existing"

  if (academicYear.associationFeeCents <= 0) {
    throw new AssociationFeeNotSetError(academicYear.label)
  }

  // Quota incassata prima dell'iscrizione: la scadenza nasce già saldata
  const payment = await tx.payment.findFirst({
    where: {
      athleteId,
      academicYearId: academicYear.id,
      feeType: FeeType.ASSOCIATION,
      status: PaymentStatus.PAID,
      deletedAt: null,
      paymentSchedules: { none: {} },
    },
    orderBy: { paymentDate: "asc" },
    select: { id: true, amountCents: true },
  })

  // Quota incassata per meno dell'importo dell'anno: vale quanto incassato,
  // come quando si salda la scadenza (src/lib/payments/collection-plan.ts)
  const amountCents = payment
    ? Math.min(payment.amountCents, academicYear.associationFeeCents)
    : academicYear.associationFeeCents

  // ON CONFLICT DO NOTHING sull'indice unico (allieva, anno): due iscrizioni
  // contemporanee non generano due quote e non fanno fallire la transazione
  const result = await tx.paymentSchedule.createMany({
    data: [
      {
        athleteId,
        academicYearId: academicYear.id,
        feeType: FeeType.ASSOCIATION,
        dueDate: params.dueDate,
        amountCents,
        status: payment ? ScheduleStatus.PAID : ScheduleStatus.DUE,
        paymentId: payment?.id ?? null,
        notes: associationFeeDescription(academicYear.label),
        createdBy: params.createdBy,
      },
    ],
    skipDuplicates: true,
  })

  if (
    result.count === 1 &&
    payment &&
    payment.amountCents !== academicYear.associationFeeCents
  ) {
    await tx.auditLog.create({
      data: {
        userId: params.createdBy,
        action: AuditAction.UPDATE,
        entityType: "Payment",
        entityId: payment.id,
        changes: {
          amountDifferences: [
            {
              schedule: associationFeeDescription(academicYear.label),
              dueCents: academicYear.associationFeeCents,
              collectedCents: payment.amountCents,
              scheduleAmountAfterCents: amountCents,
            },
          ],
        },
      },
    })
  }

  return result.count === 1 ? "created" : "existing"
}
