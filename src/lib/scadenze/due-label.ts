import { toDateOnly } from "@/lib/utils/date-only"

// ─────────────────────────────────────────────────────────────────────────
// Quanto manca, o quanto è passato.
//
// Il conto è in giorni di calendario di Roma, non in ore: una rata scaduta
// ieri sera e una scaduta ieri mattina sono tutte e due "in ritardo da 1
// giorno". Per questo le due date passano da toDateOnly prima della
// sottrazione — altrimenti fra mezzanotte e le 2 il risultato cambia di un
// giorno (vedi §17.40).
//
// Il rosso in questa pagina non si usa: un elenco di contributi in ritardo
// sarebbe tutto rosso, e il rosso ovunque non dice più niente. L'ambra
// segnala il ritardo, il neutro quello che deve ancora arrivare.
// ─────────────────────────────────────────────────────────────────────────

export type DueTone = "amber" | "neutral"

export type DueLabel = {
  text: string
  tone: DueTone
  // Giorni di ritardo: > 0 scaduta, 0 oggi, < 0 futura
  days: number
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

export function daysOverdue(dueDate: Date, at: Date): number {
  const due = toDateOnly(dueDate).getTime()
  const today = toDateOnly(at).getTime()
  return Math.round((today - due) / MS_PER_DAY)
}

function giorni(n: number): string {
  return n === 1 ? "1 giorno" : `${n} giorni`
}

export function dueLabel(dueDate: Date, at: Date): DueLabel {
  const days = daysOverdue(dueDate, at)

  if (days > 0) {
    return { text: `in ritardo da ${giorni(days)}`, tone: "amber", days }
  }
  if (days === 0) {
    return { text: "scade oggi", tone: "neutral", days }
  }
  return { text: `tra ${giorni(-days)}`, tone: "neutral", days }
}
