import type { PaymentMethod } from "@prisma/client"

// Tracciabilità del pagamento ai fini della detrazione del 19% per l'attività
// sportiva dei ragazzi: dal 2020 (art. 1 c. 679 L. 160/2019) spetta solo con
// pagamento tracciabile. File puro (niente "use server", niente server-only):
// lo usano il PDF, l'anteprima di emissione e i test.
//
// Il Record copre ogni valore dell'enum: un metodo nuovo (per esempio
// l'assegno, oggi non previsto) non compila finché non si decide qui.
const TRACEABLE_BY_METHOD: Record<PaymentMethod, boolean> = {
  CASH: false,
  TRANSFER: true,
  POS: true,
  SUMUP_LINK: true,
  // "Altro" non si può dichiarare tracciabile senza sapere cos'è
  OTHER: false,
}

export function isTraceablePaymentMethod(method: PaymentMethod): boolean {
  return TRACEABLE_BY_METHOD[method]
}

// Ricevuta che copre più pagamenti: la dicitura di detraibilità si riferisce
// all'intero importo, quindi vale solo se TUTTI i pagamenti sono tracciabili.
// Nessuna formula parziale ("detraibile per la quota di X euro").
export function areAllPaymentsTraceable(
  methods: readonly PaymentMethod[],
): boolean {
  return methods.length > 0 && methods.every(isTraceablePaymentMethod)
}

export type ReceiptPaymentNotice =
  | { kind: "TAX_DEDUCTION" }
  | { kind: "PAYMENT_METHOD"; methods: PaymentMethod[] }

// Cosa stampare in calce alla ricevuta: la dicitura di detraibilità se tutti i
// pagamenti sono tracciabili, altrimenti una riga neutra con i metodi usati,
// senza alcun riferimento alla detrazione.
export function receiptPaymentNotice(
  methods: readonly PaymentMethod[],
): ReceiptPaymentNotice {
  if (areAllPaymentsTraceable(methods)) return { kind: "TAX_DEDUCTION" }
  return { kind: "PAYMENT_METHOD", methods: [...new Set(methods)] }
}
