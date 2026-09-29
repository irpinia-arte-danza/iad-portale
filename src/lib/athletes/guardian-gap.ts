import { isMinorAt } from "@/lib/utils/age"

// ─────────────────────────────────────────────────────────────────────────
// Minorenne senza nessun genitore collegato.
//
// Non è un difetto del codice: rifiutarsi di scrivere a una minorenne è
// esattamente il comportamento giusto (vedi resolveCommunicationRecipient,
// motivo MINOR_NO_PARENT). È un'anagrafica incompleta — e finché resta così
// la famiglia è irraggiungibile senza che nulla lo segnali.
//
// Una definizione sola, usata da lista allieve, scheda e dashboard, così i
// tre posti non possono dire numeri diversi.
// ─────────────────────────────────────────────────────────────────────────

export type GuardianGapCandidate = {
  dateOfBirth: Date
  // Genitori collegati e non nel cestino
  linkedParents: number
}

export function hasGuardianGap(
  athlete: GuardianGapCandidate,
  at: Date = new Date(),
): boolean {
  return athlete.linkedParents === 0 && isMinorAt(athlete.dateOfBirth, at)
}

export function countGuardianGaps(
  athletes: GuardianGapCandidate[],
  at: Date = new Date(),
): number {
  return athletes.reduce(
    (total, athlete) => (hasGuardianGap(athlete, at) ? total + 1 : total),
    0,
  )
}

// Cosa non arriva finché il genitore manca. Ricavato dal codice che invia
// davvero, non da quello che sarebbe sensato:
// - solleciti, inviti agli stage e promemoria del certificato passano tutti
//   da resolveCommunicationRecipient, che su una minorenne senza genitori
//   restituisce MINOR_NO_PARENT e la salta;
// - la ricevuta si fermerebbe sul pagante: senza genitori il pagante ricade
//   sull'allieva, e intestare una ricevuta a una minorenne è bloccato
//   (MINOR_PAYER_BLOCKER);
// - l'area riservata è del genitore: una minorenne non può avere un accesso
//   proprio (athleteAccessEligibility, motivo MINOR).
export const GUARDIAN_GAP_LOSSES = [
  "i solleciti dei contributi non dovuti",
  "gli inviti agli stage e al saggio",
  "i promemoria del certificato medico in scadenza",
  "le ricevute, che non si possono emettere",
  "l'accesso all'area riservata",
] as const

// Filtro della lista allieve, condiviso con il link della dashboard: un nome
// solo, così i due non possono scollarsi
export const GUARDIAN_GAP_FILTER = "senza-genitore"

export function athletesWithoutGuardianHref(): string {
  return `/admin/athletes?filtro=${GUARDIAN_GAP_FILTER}`
}
