// ─────────────────────────────────────────────────────────────────────────
// Ricerca di allieve e genitori dall'header.
//
// Quando un genitore paga in sala servono cinque passaggi per arrivare a
// incassare: menu, Allieve, scorri o cerca, apri la scheda, trova il tasto.
// Qui si scrive il nome e si incassa.
//
// Nome e cognome in qualsiasi ordine: "Rossi Maria" e "Maria Rossi" devono
// trovare la stessa persona. Ogni parola deve comparire nel nome o nel
// cognome — due parole che stanno entrambe nel solo nome vanno bene
// ("Maria Chiara"), una parola che non sta da nessuna parte esclude la riga.
//
// Accenti: Postgres distingue "Nicolò" da "Nicolo" senza l'estensione
// unaccent, che non abbiamo. Le maiuscole invece non contano (mode
// insensitive). È il comportamento che hanno già gli altri campi di ricerca
// del portale.
// ─────────────────────────────────────────────────────────────────────────

export const MIN_SEARCH_LENGTH = 2
export const MAX_SEARCH_RESULTS = 8
// Oltre questi limiti la ricerca non cambia risultato, cambia solo il costo
// della query: ogni parola è un AND di due ILIKE
export const MAX_SEARCH_LENGTH = 60
export const MAX_SEARCH_TERMS = 5

type Contains = { contains: string; mode: "insensitive" }
export type NameSearchWhere = {
  AND: { OR: ({ firstName: Contains } | { lastName: Contains })[] }[]
}

// Le parole della ricerca: spazi doppi, a capo e spazi ai bordi non contano.
// Al massimo 60 caratteri e 5 parole: il resto si scarta
export function searchTerms(input: string): string[] {
  return input
    .trim()
    .slice(0, MAX_SEARCH_LENGTH)
    .split(/\s+/)
    .filter((term) => term.length > 0)
    .slice(0, MAX_SEARCH_TERMS)
}

export function isSearchable(input: string): boolean {
  return input.trim().length >= MIN_SEARCH_LENGTH
}

// null quando non c'è abbastanza da cercare: chi chiama non interroga il DB
export function nameSearchWhere(input: string): NameSearchWhere | null {
  if (!isSearchable(input)) return null
  const terms = searchTerms(input)
  if (terms.length === 0) return null

  return {
    AND: terms.map((term) => ({
      OR: [
        { firstName: { contains: term, mode: "insensitive" } },
        { lastName: { contains: term, mode: "insensitive" } },
      ],
    })),
  }
}

// ── Risultati ────────────────────────────────────────────────────────────
// Di proposito senza codice fiscale, note, email e telefono: un elenco che
// compare mentre si digita non è il posto dei dati di contatto, men che meno
// di quelli di una minorenne. Il numero esce dal server solo dentro il link
// di WhatsApp, che è il motivo per cui il tasto esiste.

export type AthleteHit = {
  kind: "athlete"
  id: string
  name: string
  age: number | null
  course: string | null
  // Al massimo due: certificato (scaduto o assente) e contributi in ritardo
  certificateMissing: boolean
  overdue: boolean
}

export type ParentHit = {
  kind: "parent"
  id: string
  name: string
  // Nomi delle figlie collegate: dice subito se è il genitore giusto
  athletes: string[]
  whatsappHref: string | null
}

export type PersonHit = AthleteHit | ParentHit

// Allieve e genitori insieme, alternati a coppie: con otto Rossi allieve un
// genitore Rossi resterebbe fuori dall'elenco senza che si capisca perché
export function mergeHits(
  athletes: AthleteHit[],
  parents: ParentHit[],
  max: number = MAX_SEARCH_RESULTS,
): PersonHit[] {
  const out: PersonHit[] = []
  let a = 0
  let p = 0
  while (out.length < max && (a < athletes.length || p < parents.length)) {
    if (a < athletes.length) out.push(athletes[a++])
    if (out.length < max && p < parents.length) out.push(parents[p++])
  }
  return out
}
