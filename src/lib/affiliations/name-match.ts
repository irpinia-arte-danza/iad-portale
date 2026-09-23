// Abbinamento tessera → allieva.
//
// Regola: nome e cognome con confronto tollerante, data di nascita esatta.
// In un paese le omonimie esistono, quindi il nome da solo non basta mai; la
// data di nascita invece deve combaciare al giorno, senza tolleranze.

export type PersonName = {
  firstName: string
  lastName: string
}

// Parole che compaiono nelle intestazioni del PDF dell'ente e non fanno parte
// del nome: se il testo estratto le trascina dentro, vanno buttate.
const HEADER_WORDS = new Set([
  "NOME",
  "COGNOME",
  "DATA",
  "DI",
  "NASCITA",
  "SESSO",
  "TESSERA",
  "TESSERATO",
  "SOCIO",
  "ANNO",
  "SOCIALE",
  "AFFILIATA",
  "AFFILIATO",
  "ASSOCIAZIONE",
])

// Maiuscolo senza accenti: "Nicolò" e "NICOLO" diventano la stessa cosa.
// L'apostrofo sparisce senza lasciare uno spazio al suo posto, così "D'Angelo"
// diventa "DANGELO" e ritrova il "D ANGELO" che certi PDF stampano staccato.
export function normalizeNameText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/['’`´]/g, "")
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
}

export function nameTokens(value: string): string[] {
  const normalized = normalizeNameText(value)
  if (!normalized) return []
  return normalized.split(" ").filter((t) => t.length > 0)
}

// Token del nome letti dal PDF, senza le parole di intestazione che il testo
// estratto si trascina dietro.
export function personTokensFromPdf(value: string): string[] {
  return nameTokens(value).filter((token) => !HEADER_WORDS.has(token))
}

function sameMultiset(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const sortedA = [...a].sort()
  const sortedB = [...b].sort()
  return sortedA.every((token, i) => token === sortedB[i])
}

function matchesExactly(pdfTokens: string[], anagrafica: string[][]): boolean {
  const joined = pdfTokens.join("")
  return anagrafica.some(
    (tokens) => sameMultiset(pdfTokens, tokens) || joined === tokens.join(""),
  )
}

// Tollerante su come il nome è scritto, non su chi è:
// - accenti e apostrofi, già normalizzati dai token
// - ordine nome/cognome invertito (il PDF dell'ente non segue l'anagrafica)
// - doppi nomi staccati o attaccati ("Maria Grazia" / "Mariagrazia")
// - un'iniziale puntata in mezzo, che in anagrafica non c'è
export function namesMatch(pdfTokens: string[], person: PersonName): boolean {
  const first = nameTokens(person.firstName)
  const last = nameTokens(person.lastName)
  if (pdfTokens.length === 0 || first.length + last.length === 0) return false

  const anagrafica = [
    [...first, ...last],
    [...last, ...first],
  ]
  if (matchesExactly(pdfTokens, anagrafica)) return true

  // Secondo tentativo senza le sigle di una lettera sola: un'iniziale in
  // mezzo non deve far fallire l'abbinamento. Si prova dopo, perché al primo
  // giro la "D" di D'Angelo serve.
  const withoutInitials = pdfTokens.filter((t) => t.length > 1)
  if (
    withoutInitials.length !== pdfTokens.length &&
    withoutInitials.length > 0
  ) {
    return matchesExactly(withoutInitials, anagrafica)
  }
  return false
}

// Stesso giorno di calendario, confrontato in UTC come sono salvate le date
// "solo data" (@db.Date).
export function sameBirthDay(a: Date, b: Date): boolean {
  const x = new Date(a)
  const y = new Date(b)
  return (
    x.getUTCFullYear() === y.getUTCFullYear() &&
    x.getUTCMonth() === y.getUTCMonth() &&
    x.getUTCDate() === y.getUTCDate()
  )
}

export type MatchCandidate = PersonName & {
  id: string
  dateOfBirth: Date
}

export type AthleteMatch =
  | { status: "matched"; athleteId: string }
  | { status: "not_found" }
  | { status: "ambiguous"; athleteIds: string[] }

export function matchAthlete(
  person: { tokens: string[]; dateOfBirth: Date },
  candidates: MatchCandidate[],
): AthleteMatch {
  const hits = candidates.filter(
    (c) =>
      sameBirthDay(c.dateOfBirth, person.dateOfBirth) &&
      namesMatch(person.tokens, c),
  )
  if (hits.length === 1) return { status: "matched", athleteId: hits[0].id }
  if (hits.length === 0) return { status: "not_found" }
  return { status: "ambiguous", athleteIds: hits.map((h) => h.id) }
}
