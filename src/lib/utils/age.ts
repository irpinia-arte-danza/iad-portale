// Maggiore età: serve alle ricevute (a chi si può intestare un documento
// fiscale) e alle comunicazioni (a chi si può scrivere quando non ci sono
// genitori collegati). Funzione pura, confronto fra giorni UTC come le
// colonne @db.Date.
//
// Nata il 29 febbraio: il diciottesimo compleanno cade il 1° marzo negli anni
// non bisestili, quindi resta minorenne un giorno in più. Nel dubbio il verso
// giusto è questo.
export function isMinorAt(dateOfBirth: Date, at: Date): boolean {
  const eighteenth = Date.UTC(
    dateOfBirth.getUTCFullYear() + 18,
    dateOfBirth.getUTCMonth(),
    dateOfBirth.getUTCDate(),
  )
  const day = Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate())
  return day < eighteenth
}
