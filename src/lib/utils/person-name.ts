// ─────────────────────────────────────────────────────────────────────────
// Come si scrive il nome di una persona, e dove.
//
// Negli **elenchi** prima il cognome: sono ordinati per cognome, e con "Nome
// Cognome" l'occhio deve saltare a metà riga per seguire l'ordine. Nei
// **titoli di scheda** e nei **documenti** (ricevute, moduli, email) prima il
// nome: lì si sta parlando di una persona, non la si sta cercando in una
// lista.
//
// Prima era scritto a mano in una quarantina di punti, con Ricevute che
// faceva il contrario di tutti gli altri elenchi.
// ─────────────────────────────────────────────────────────────────────────

export type NameParts = {
  firstName: string | null
  lastName: string | null
}

function clean(value: string | null | undefined): string {
  return (value ?? "").trim()
}

function join(parts: (string | null | undefined)[]): string {
  return parts
    .map(clean)
    .filter((p) => p.length > 0)
    .join(" ")
}

/** Elenchi, ordinati per cognome: "Rossi Maria" */
export function listName(p: NameParts): string {
  return join([p.lastName, p.firstName])
}

/** Titoli di scheda e documenti: "Maria Rossi" */
export function fullName(p: NameParts): string {
  return join([p.firstName, p.lastName])
}

/**
 * Come `listName`, ma per i dati congelati delle ricevute, dove il nome è una
 * stringa sola e non si può dividere a indovinare ("Maria Teresa Di Napoli"
 * non si spezza sull'ultimo spazio). Se ci sono nome e cognome veri si usa
 * l'ordine da elenco, altrimenti si stampa la stringa come è stata salvata.
 */
export function listNameOrFrozen(
  live: NameParts | null | undefined,
  frozen: string | null | undefined,
): string | null {
  if (live) {
    const name = listName(live)
    if (name.length > 0) return name
  }
  const fallback = clean(frozen)
  return fallback.length > 0 ? fallback : null
}
