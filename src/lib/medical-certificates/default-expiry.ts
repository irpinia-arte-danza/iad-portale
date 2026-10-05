// ─────────────────────────────────────────────────────────────────────────
// Scadenza proposta per un certificato medico: un anno dal rilascio.
//
// Vale per entrambi i tipi — il non agonistico per legge, l'agonistico per
// la danza sportiva — ma il medico può scrivere una scadenza più breve: la
// data proposta è un punto di partenza, non un vincolo.
//
// Tutto in stringhe di calendario AAAA-MM-GG, come le scrive e le legge
// <input type="date">: nessun passaggio da timestamp, quindi il fuso non può
// spostare il giorno. È il motivo per cui questa funzione sostituisce due
// implementazioni precedenti, una delle quali costruiva le date in ora locale.
//
// Il 29 febbraio diventa 28 febbraio: l'anno dopo quel giorno non esiste.
// ─────────────────────────────────────────────────────────────────────────

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/

function daysInMonth(year: number, month: number): number {
  // month 1-12. Febbraio dell'anno bisestile ha 29 giorni.
  if (month === 2) {
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
    return leap ? 29 : 28
  }
  return [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]
}

function pad(value: number): string {
  return String(value).padStart(2, "0")
}

// Stringa vuota se la data non è una AAAA-MM-GG valida: chi chiama non deve
// distinguere fra "non compilata" e "non valida", in entrambi i casi non c'è
// niente da proporre.
export function defaultExpiryFromIssue(issueDate: string): string {
  const match = ISO_DAY.exec(issueDate.trim())
  if (!match) return ""

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12) return ""
  if (day < 1 || day > daysInMonth(year, month)) return ""

  const nextYear = year + 1
  const lastDay = daysInMonth(nextYear, month)
  return `${nextYear}-${pad(month)}-${pad(Math.min(day, lastDay))}`
}

// La scadenza che si vede è ancora quella calcolata da questo rilascio?
//
// Serve a non sovrascrivere una data scritta a mano: se Giuseppina corregge
// la scadenza perché il medico ne ha messa un'altra, cambiare il rilascio non
// deve riportarla al calcolo. E serve a mostrare la riga "Calcolata…" solo
// quando il valore è davvero quello proposto.
export function isDefaultExpiry(
  issueDate: string,
  expiryDate: string,
): boolean {
  const expected = defaultExpiryFromIssue(issueDate)
  return expected !== "" && expected === expiryDate.trim()
}

// La scadenza si può ricalcolare cambiando il rilascio?
//
// Sì se è vuota, o se è ancora quella proposta dal rilascio PRECEDENTE. No se
// è stata scritta a mano: il medico può aver messo una scadenza più breve, e
// quella vince sul calcolo.
//
// Regola in un posto solo: la usano il form della nuova allieva e il dialog
// della scheda, che prima avevano due versioni diverse — entrambe
// sovrascrivevano una data scritta a mano quando precedeva il nuovo rilascio.
export function shouldRefillExpiry(
  previousIssueDate: string,
  currentExpiryDate: string,
): boolean {
  if (currentExpiryDate.trim() === "") return true
  return isDefaultExpiry(previousIssueDate, currentExpiryDate)
}

// Riga sotto il campo scadenza, solo quando è stata precompilata
export const DEFAULT_EXPIRY_HINT =
  "Calcolata: un anno dal rilascio. Se sul certificato c'è un'altra data, usa quella."
