import type { Prisma } from "@prisma/client"

import { isMinorAt } from "@/lib/utils/age"

import { athleteScopeWhere, type PortalScope } from "./portal-scope"

// ─────────────────────────────────────────────────────────────────────────
// Cosa vede, di un'allieva, chi è entrato nell'area riservata.
//
// athleteScopeWhere dice QUALI allieve si vedono. Qui si decide COSA se ne
// vede, e la regola è una: i dati personali (certificato medico, presenze,
// tessera, orari suoi, foto) li vede chi li riguarda. Un'allieva per sé,
// sempre. Un genitore finché la figlia è minorenne. Da maggiorenne, al
// genitore collegato restano le cose di pagamento — scadenze, pagamenti e le
// ricevute intestate a lui — che sono anche l'unico motivo per cui resta
// collegato.
//
// Fra due genitori della stessa allieva, ciascuno vede l'allieva ma non
// l'altro: non i suoi recapiti, non le ricevute intestate a lui. Le scadenze
// aperte le vedono entrambi, perché chiunque dei due può pagarle.
//
// Regole decise in fase di sviluppo, da confermare con Giuseppina: vivono in
// un posto solo, e i filtri Prisma si ricavano da qui, così le query non
// possono dire una cosa e i componenti un'altra.
// ─────────────────────────────────────────────────────────────────────────

export function canSeePersonalData(
  scope: PortalScope,
  athlete: { dateOfBirth: Date },
  at: Date = new Date(),
): boolean {
  if (scope.kind === "athlete") return true
  return isMinorAt(athlete.dateOfBirth, at)
}

// Chi è nata DOPO questa data è minorenne nel giorno dato: lo stesso
// confronto di isMinorAt, scritto come filtro. Chi compie 18 anni oggi è
// nata esattamente in questa data e non passa.
export function minorBornAfter(at: Date): Date {
  return new Date(
    Date.UTC(at.getUTCFullYear() - 18, at.getUTCMonth(), at.getUTCDate()),
  )
}

// Le allieve dell'ambito di cui si possono vedere i dati personali
export function personalDataScopeWhere(
  scope: PortalScope,
  at: Date = new Date(),
): Prisma.AthleteWhereInput {
  if (scope.kind === "athlete") return athleteScopeWhere(scope)
  return { ...athleteScopeWhere(scope), dateOfBirth: { gt: minorBornAfter(at) } }
}

// Una ricevuta è intestata a una persona: la vede quella persona (il
// genitore con payerId), oppure l'allieva stessa, che vede tutto ciò che la
// riguarda. L'altro genitore sa che è stata emessa, non a chi.
export function canSeeReceipt(
  scope: PortalScope,
  receipt: { payerId: string | null },
): boolean {
  if (scope.kind === "athlete") return true
  return receipt.payerId === scope.parentId
}
