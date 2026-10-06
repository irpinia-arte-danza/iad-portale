import { isMinorAt } from "@/lib/utils/age"
import { fullName, listName } from "@/lib/utils/person-name"

// ─────────────────────────────────────────────────────────────────────────
// Chi paga per un'allieva.
//
// La regola era scritta nella scheda allieva e serviva anche all'elenco: il
// pagante indicato, poi il contatto principale, poi il primo collegato.
// Senza nessun genitore collegato ci sono due casi diversi, e l'elenco deve
// distinguerli:
//
// • maggiorenne → paga lei, ed è normale (vedi #35);
// • minorenne → non si emettono ricevute né solleciti, la famiglia è
//   irraggiungibile. È lo stesso buco che conta il riquadro "Minorenni senza
//   genitore" in dashboard, e qui si vede riga per riga.
//
// Funzione pura: la usano l'elenco (per la colonna "Chi paga") e la scheda.
// ─────────────────────────────────────────────────────────────────────────

export type PayerParent = {
  id: string
  firstName: string
  lastName: string
}

export type PayerCandidate = {
  isPrimaryPayer: boolean
  isPrimaryContact: boolean
  parent: PayerParent
}

/** Il genitore che paga, fra quelli collegati */
export function pickPayerRelation<T extends PayerCandidate>(
  relations: T[],
): T | null {
  return (
    relations.find((r) => r.isPrimaryPayer) ??
    relations.find((r) => r.isPrimaryContact) ??
    relations[0] ??
    null
  )
}

export type AthletePayer =
  | { kind: "PARENT"; parentId: string; name: string }
  // Maggiorenne senza genitori collegati: paga lei
  | { kind: "ATHLETE" }
  // Minorenne senza genitori collegati: anagrafica da completare
  | { kind: "NONE" }

export type PayerAthlete = {
  dateOfBirth: Date
  parentRelations: PayerCandidate[]
}

/**
 * Per l'elenco: il nome del pagante in forma "Cognome Nome", perché è una
 * colonna di una lista ordinata per cognome.
 */
export function athleteListPayer(
  athlete: PayerAthlete,
  at: Date = new Date(),
): AthletePayer {
  const relation = pickPayerRelation(athlete.parentRelations)
  if (relation) {
    return {
      kind: "PARENT",
      parentId: relation.parent.id,
      name: listName(relation.parent),
    }
  }
  return isMinorAt(athlete.dateOfBirth, at)
    ? { kind: "NONE" }
    : { kind: "ATHLETE" }
}

/**
 * Per la scheda e i documenti: "Nome Cognome", che è come si presenta una
 * persona.
 */
export function payerDisplayName(parent: PayerParent): string {
  return fullName(parent)
}
