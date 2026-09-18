import { UserRole, type Prisma } from "@prisma/client"

// ─────────────────────────────────────────────────────────────────────────
// Ambito dell'area riservata: quali allieve può vedere chi è entrato.
//
// Fino a ieri la domanda era "di che genitore sei?", e infatti le query
// filtravano per parentId. Con le allieve maggiorenni del corso adulti la
// domanda giusta è un'altra: "quali allieve puoi vedere?". Un genitore vede
// le figlie collegate, un'allieva vede sé stessa.
// ─────────────────────────────────────────────────────────────────────────

export type PortalScope =
  | { kind: "parent"; parentId: string }
  | { kind: "athlete"; athleteId: string }

// Filtro Prisma sull'allieva. Di proposito non include deletedAt: ogni query
// decide se vuole anche le archiviate (lo storico dei pagamenti sì, gli
// elenchi no), come faceva prima.
export function athleteScopeWhere(
  scope: PortalScope,
): Prisma.AthleteWhereInput {
  return scope.kind === "parent"
    ? { parentRelations: { some: { parentId: scope.parentId } } }
    : { id: scope.athleteId }
}

// Ambito di un account già risolto, null per chi non usa l'area riservata
// (un admin, o un profilo incompleto).
export function portalScopeOf(account: {
  role: UserRole
  parentId: string | null
  athleteId: string | null
}): PortalScope | null {
  if (account.role === UserRole.PARENT && account.parentId) {
    return { kind: "parent", parentId: account.parentId }
  }
  if (account.role === UserRole.ATHLETE && account.athleteId) {
    return { kind: "athlete", athleteId: account.athleteId }
  }
  return null
}
