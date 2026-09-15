import "server-only"

import {
  AuditAction,
  PaymentStatus,
  Prisma,
  ReceiptStatus,
} from "@prisma/client"

import { associationFeeDescription } from "@/lib/fees/association-fee"
import {
  SCHEDULE_LINE_SELECT,
  compareScheduleLines,
  describeSchedule,
  type ScheduleLine,
} from "@/lib/payments/schedule-lines"
import { prisma } from "@/lib/prisma"

import {
  feeTypeToReceiptCategory,
  formatReceiptNumber,
  todayInRome,
} from "./numbering"
import { archiveReceiptPdf } from "./receipt-pdf-store"
import type {
  IssuedReceiptInfo,
  IssueReceiptResult,
  ReceiptIssuePreview,
  ReceiptLine,
  ReceiptPayerSource,
} from "./types"

// ─────────────────────────────────────────────────────────────────────────
// Emissione ricevute (solo admin, solo su richiesta esplicita).
//
// Regole:
// - il numero nasce solo qui, mai in automatico né da azioni del genitore
// - un pagamento ha al massimo una ricevuta (payment_id unique)
// - una ricevuta non si cancella: allo storno del pagamento si annulla
//   mantenendo il numero (cancelReceiptForPayment)
// - pagante, allieva, codici fiscali, causale e importo sono congelati
//   all'emissione: la ristampa resta identica anche se cambiano i dati
// - un pagamento che chiude più scadenze ha la causale a righe (una per
//   scadenza), congelata in Receipt.lines
// - il PDF si genera e si archivia all'emissione, dopo il commit del numero:
//   da lì la ricevuta si consegna sempre con quel file (receipt-pdf-store.ts)
// ─────────────────────────────────────────────────────────────────────────

const PERSON_SELECT = {
  firstName: true,
  lastName: true,
  fiscalCode: true,
  residenceStreet: true,
  residenceNumber: true,
  residenceCap: true,
  residenceCity: true,
  residenceProvince: true,
} satisfies Prisma.ParentSelect

const RECEIPT_INFO_SELECT = {
  id: true,
  receiptNumber: true,
  issueDate: true,
  status: true,
} satisfies Prisma.ReceiptSelect

const PAYMENT_FOR_RECEIPT_SELECT = {
  id: true,
  status: true,
  feeType: true,
  amountCents: true,
  paymentDate: true,
  method: true,
  notes: true,
  academicYear: { select: { label: true } },
  parent: { select: PERSON_SELECT },
  athlete: {
    select: {
      ...PERSON_SELECT,
      parentRelations: {
        where: { parent: { deletedAt: null } },
        orderBy: [
          { isPrimaryPayer: "desc" },
          { isPrimaryContact: "desc" },
          { createdAt: "asc" },
        ],
        select: { isPrimaryPayer: true, parent: { select: PERSON_SELECT } },
      },
    },
  },
  // Scadenze chiuse dal pagamento: una → causale come sempre, più → righe
  paymentSchedules: { select: SCHEDULE_LINE_SELECT },
  receipt: { select: RECEIPT_INFO_SELECT },
} satisfies Prisma.PaymentSelect

type PaymentForReceipt = Prisma.PaymentGetPayload<{
  select: typeof PAYMENT_FOR_RECEIPT_SELECT
}>

type Person = Prisma.ParentGetPayload<{ select: typeof PERSON_SELECT }>

function fullName(p: { firstName: string; lastName: string }): string {
  return `${p.firstName} ${p.lastName}`.trim()
}

function composeAddress(p: Person): string | null {
  const street = [p.residenceStreet, p.residenceNumber]
    .filter(Boolean)
    .join(" ")
    .trim()
  const place = [
    p.residenceCap,
    p.residenceCity,
    p.residenceProvince ? `(${p.residenceProvince})` : null,
  ]
    .filter(Boolean)
    .join(" ")
    .trim()
  const full = [street, place].filter((s) => s.length > 0).join(" — ")
  return full.length > 0 ? full : null
}

// Intestatario della ricevuta: pagante indicato sul pagamento, altrimenti il
// genitore che paga le quote, altrimenti il primo genitore, altrimenti
// l'allieva (maggiorenne o senza genitori collegati).
function resolvePayer(payment: PaymentForReceipt): {
  person: Person
  source: ReceiptPayerSource
} {
  if (payment.parent) return { person: payment.parent, source: "PAYMENT" }
  const relation = payment.athlete.parentRelations[0]
  if (relation) {
    return {
      person: relation.parent,
      source: relation.isPrimaryPayer ? "PRIMARY_PAYER" : "GUARDIAN",
    }
  }
  return { person: payment.athlete, source: "ATHLETE" }
}

// Righe della causale: solo per un pagamento che chiude più scadenze
function buildLines(schedules: ScheduleLine[]): ReceiptLine[] | null {
  if (schedules.length < 2) return null
  return [...schedules].sort(compareScheduleLines).map((s) => ({
    description: describeSchedule(s),
    amountCents: s.amountCents,
    feeType: s.feeType,
  }))
}

// Causale di una ricevuta a scadenza singola, come prima dell'incasso
// multiplo: quota associativa sempre con l'anno (le note restano interne);
// per le altre le note del pagamento se presenti, altrimenti ricostruita da
// stage, saggio o costume. Le mensili bastano tipo quota e periodo.
function buildDescription(payment: PaymentForReceipt): string | null {
  const schedules = payment.paymentSchedules
  if (schedules.length >= 2) return null

  const schedule = schedules[0] ?? null
  if (payment.feeType === "ASSOCIATION") {
    return (
      schedule?.notes ?? associationFeeDescription(payment.academicYear.label)
    )
  }

  if (payment.notes) return payment.notes
  if (!schedule) return null

  switch (schedule.feeType) {
    case "STAGE":
    case "SHOWCASE_1":
    case "SHOWCASE_2":
    case "COSTUME":
      return describeSchedule(schedule)
    default:
      return null
  }
}

function toInfo(receipt: IssuedReceiptInfo): IssuedReceiptInfo {
  return {
    id: receipt.id,
    receiptNumber: receipt.receiptNumber,
    issueDate: receipt.issueDate,
    status: receipt.status,
  }
}

function buildWarnings(
  payment: PaymentForReceipt,
  payer: { person: Person; source: ReceiptPayerSource },
): string[] {
  const warnings: string[] = []
  const payerName = fullName(payer.person)

  if (payer.source === "PRIMARY_PAYER") {
    warnings.push(
      `Il pagamento non indica il pagante: la ricevuta sarà intestata a ${payerName}, segnato come genitore che paga le quote.`,
    )
  } else if (payer.source === "GUARDIAN") {
    warnings.push(
      `Il pagamento non indica il pagante e nessun genitore è segnato come "paga le quote": la ricevuta sarà intestata a ${payerName}.`,
    )
  } else if (payer.source === "ATHLETE") {
    warnings.push(
      "Nessun genitore collegato: la ricevuta sarà intestata all'allieva.",
    )
  }

  if (!payer.person.fiscalCode) {
    warnings.push(
      "Manca il codice fiscale del pagante: la ricevuta non sarà utilizzabile per la detrazione nel 730.",
    )
  }
  if (payer.source !== "ATHLETE" && !payment.athlete.fiscalCode) {
    warnings.push("Manca il codice fiscale dell'allieva.")
  }
  if (!composeAddress(payer.person)) {
    warnings.push("Manca l'indirizzo di residenza del pagante.")
  }

  return warnings
}

async function loadPayment(
  client: Prisma.TransactionClient | typeof prisma,
  paymentId: string,
): Promise<PaymentForReceipt | null> {
  return client.payment.findFirst({
    where: { id: paymentId, deletedAt: null },
    select: PAYMENT_FOR_RECEIPT_SELECT,
  })
}

export async function buildIssuePreview(
  paymentId: string,
): Promise<ReceiptIssuePreview | null> {
  const payment = await loadPayment(prisma, paymentId)
  if (!payment) return null

  const payer = resolvePayer(payment)
  const blocker =
    !payment.receipt && payment.status === PaymentStatus.REVERSED
      ? "Il pagamento è stornato: non si può emettere la ricevuta."
      : null

  return {
    paymentId: payment.id,
    athleteName: fullName(payment.athlete),
    amountCents: payment.amountCents,
    feeType: payment.feeType,
    paymentDate: payment.paymentDate,
    paymentMethod: payment.method,
    lines: buildLines(payment.paymentSchedules) ?? [],
    existing: payment.receipt ? toInfo(payment.receipt) : null,
    payer: {
      name: fullName(payer.person),
      fiscalCode: payer.person.fiscalCode,
      address: composeAddress(payer.person),
      source: payer.source,
    },
    blocker,
    warnings: payment.receipt ? [] : buildWarnings(payment, payer),
  }
}

function isUniqueViolationOn(error: unknown, column: string): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    String(error.meta?.target ?? "").includes(column)
  )
}

export async function issueReceiptCore(params: {
  paymentId: string
  adminUserId: string
}): Promise<IssueReceiptResult> {
  try {
    const result = await prisma.$transaction(
      async (tx): Promise<IssueReceiptResult> => {
        const payment = await loadPayment(tx, params.paymentId)
        if (!payment) return { ok: false, error: "Pagamento non trovato" }

        // Ristampa: stesso numero, stessa data, nessun nuovo numero
        if (payment.receipt) {
          return { ok: true, alreadyIssued: true, receipt: toInfo(payment.receipt) }
        }
        if (payment.status === PaymentStatus.REVERSED) {
          return {
            ok: false,
            error: "Il pagamento è stornato: non si può emettere la ricevuta.",
          }
        }

        // Assegnazione atomica del numero. L'UPDATE con incremento prende il
        // lock sulla riga del contatore fino al commit: un'emissione
        // concorrente attende e legge il valore già incrementato. Se questa
        // transazione fallisce, l'incremento viene annullato (niente buchi).
        const settings = await tx.receiptSettings.update({
          where: { id: 1 },
          data: { receiptNumber: { increment: 1 } },
          select: { receiptPrefix: true, receiptNumber: true },
        })

        // Anti-downgrade: il contatore non può mai riusare un progressivo già
        // emesso con lo stesso prefisso (stessa regola di Impostazioni → Ricevute).
        const highest = await tx.receipt.aggregate({
          where: { receiptNumber: { startsWith: settings.receiptPrefix } },
          _max: { sequence: true },
        })
        let sequence = settings.receiptNumber
        const maxIssued = highest._max.sequence ?? 0
        if (sequence <= maxIssued) {
          sequence = maxIssued + 1
          await tx.receiptSettings.update({
            where: { id: 1 },
            data: { receiptNumber: sequence },
          })
        }

        const payer = resolvePayer(payment)
        // Più scadenze sono sempre della stessa numerazione (vincolo di
        // registrazione): la categoria del tipo principale vale per tutte
        const category = feeTypeToReceiptCategory(payment.feeType)
        const receiptNumber = formatReceiptNumber({
          prefix: settings.receiptPrefix,
          academicYearLabel: payment.academicYear.label,
          sequence,
          category,
        })
        const lines = buildLines(payment.paymentSchedules)

        const receipt = await tx.receipt.create({
          data: {
            paymentId: payment.id,
            category,
            receiptNumber,
            sequence,
            issueDate: todayInRome(),
            issuedBy: params.adminUserId,
            status: ReceiptStatus.VALID,
            payerName: fullName(payer.person),
            payerFiscalCode: payer.person.fiscalCode,
            payerAddress: composeAddress(payer.person),
            athleteName: fullName(payment.athlete),
            athleteFiscalCode: payment.athlete.fiscalCode,
            description: buildDescription(payment),
            amountCents: payment.amountCents,
            lines: lines ?? undefined,
          },
          select: RECEIPT_INFO_SELECT,
        })

        await tx.auditLog.create({
          data: {
            userId: params.adminUserId,
            action: AuditAction.RECEIPT_ISSUE,
            entityType: "Receipt",
            entityId: receipt.id,
            changes: {
              receiptNumber,
              sequence,
              paymentId: payment.id,
              payerSource: payer.source,
              lines: lines?.length ?? 1,
            },
          },
        })

        return { ok: true, alreadyIssued: false, receipt: toInfo(receipt) }
      },
      { timeout: 15_000 },
    )

    // PDF generato e archiviato subito dopo il numero, FUORI dalla transazione:
    // se l'archivio non risponde la ricevuta resta emessa e il PDF si archivia
    // al primo accesso o dal cron notturno. archiveReceiptPdf non lancia.
    if (result.ok && !result.alreadyIssued) {
      const archived = await archiveReceiptPdf(result.receipt.id)
      return { ...result, pdfDeferred: !archived }
    }
    return result
  } catch (error) {
    // Due emissioni contemporanee sullo stesso pagamento: vince la prima,
    // la seconda restituisce la ricevuta già emessa.
    if (isUniqueViolationOn(error, "payment_id")) {
      const existing = await prisma.receipt.findUnique({
        where: { paymentId: params.paymentId },
        select: RECEIPT_INFO_SELECT,
      })
      if (existing) {
        return { ok: true, alreadyIssued: true, receipt: toInfo(existing) }
      }
    }
    if (isUniqueViolationOn(error, "receipt_number")) {
      return {
        ok: false,
        error:
          "Il numero di ricevuta calcolato risulta già usato: controlla il contatore in Impostazioni → Ricevute.",
      }
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return {
        ok: false,
        error: "Numerazione ricevute non configurata: controlla Impostazioni → Ricevute.",
      }
    }
    console.error("[receipt issue] unexpected error", {
      paymentId: params.paymentId,
      message: error instanceof Error ? error.message : "unknown",
    })
    return { ok: false, error: "Errore durante l'emissione della ricevuta, riprova." }
  }
}

// Annullamento dentro la transazione dello storno. Mantiene numero e data di
// emissione; restituisce il numero annullato (null se non c'era una ricevuta
// valida).
export async function cancelReceiptForPayment(
  tx: Prisma.TransactionClient,
  params: { paymentId: string; userId: string; reason: string },
): Promise<string | null> {
  const receipt = await tx.receipt.findUnique({
    where: { paymentId: params.paymentId },
    select: { id: true, receiptNumber: true, status: true },
  })
  if (!receipt || receipt.status !== ReceiptStatus.VALID) return null

  await tx.receipt.update({
    where: { id: receipt.id },
    data: {
      status: ReceiptStatus.CANCELLED,
      cancelledAt: new Date(),
      cancelledBy: params.userId,
      cancelReason: params.reason,
    },
  })

  await tx.auditLog.create({
    data: {
      userId: params.userId,
      action: AuditAction.RECEIPT_CANCEL,
      entityType: "Receipt",
      entityId: receipt.id,
      changes: {
        receiptNumber: receipt.receiptNumber,
        paymentId: params.paymentId,
        reason: params.reason,
      },
    },
  })

  return receipt.receiptNumber
}
