import { isMinorAt } from "@/lib/utils/age"

// ─────────────────────────────────────────────────────────────────────────
// Chi può avere un accesso proprio: solo un'allieva maggiorenne senza
// genitori collegati, cioè il corso adulti.
//
// Le due condizioni hanno ragioni diverse. Minorenne: le comunicazioni e
// l'accesso della scuola passano da un adulto. Con un genitore collegato:
// l'accesso è il suo, e due account sugli stessi dati — senza sapere chi è
// il pagante — confondono più di quanto aiutino.
//
// Regola in un posto solo: la usano il motore dell'invito (che non si può
// aggirare) e la scheda allieva (che decide se mostrare la sezione).
// ─────────────────────────────────────────────────────────────────────────

export type AthleteAccessEligibility =
  | { ok: true }
  | { ok: false; reason: "MINOR" | "HAS_PARENT"; message: string }

export function athleteAccessEligibility(params: {
  dateOfBirth: Date
  // Genitori collegati e non nel cestino
  linkedParents: number
  at?: Date
}): AthleteAccessEligibility {
  if (isMinorAt(params.dateOfBirth, params.at ?? new Date())) {
    return {
      ok: false,
      reason: "MINOR",
      message: "L'allieva è minorenne: l'accesso va dato a un genitore, non a lei.",
    }
  }

  if (params.linkedParents > 0) {
    return {
      ok: false,
      reason: "HAS_PARENT",
      message: "L'allieva ha un genitore collegato: l'accesso si manda al genitore.",
    }
  }

  return { ok: true }
}
