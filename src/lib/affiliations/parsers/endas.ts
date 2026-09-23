import { personTokensFromPdf } from "../name-match"

import {
  normalizeSpaces,
  parseItalianDate,
  type CardParseResult,
  type CardParser,
  type ParsedCardPerson,
} from "./types"

// Tessera ENDAS. Il PDF esce dal portale dell'ente ed è testo vero, non una
// scansione. Le righe che contano:
//
//   TESSERA N° 1293190 Plus - Anno sociale 2026
//   Data iscrizione 14/09/2026
//   Data scadenza 13/09/2027
//   AFFILIATA A.S.D. IAD - IRPINIA ARTE DANZA
//   NOME / COGNOME / DATA DI NASCITA / SESSO
//
// Il testo estratto da un PDF non conserva a capo e colonne in modo
// affidabile: qui si lavora su tutto il testo appiattito a spazi singoli e si
// àncora ai pezzi stabili (le etichette), mai alla posizione.

const CARD_LINE =
  /TESSERA\s*N\s*[°ºo.]*\s*([0-9]{4,12})\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ ]{0,20}?)?\s*[-–—]?\s*Anno\s+sociale\s*:?\s*([0-9]{4})/i

const ISSUE_DATE = /Data\s+iscrizione\s*:?\s*(\d{1,2}[/.-]\d{1,2}[/.-]\d{4})/i
const EXPIRY_DATE = /Data\s+scadenza\s*:?\s*(\d{1,2}[/.-]\d{1,2}[/.-]\d{4})/i

// Forma a etichette, quella che il portale ENDAS produce davvero:
// … NOME <nome> COGNOME <cognome> DATA DI NASCITA <data> SESSO <F|M> …
const LABELLED_PERSON =
  /\bNOME\b\s*:?\s*([A-Za-zÀ-ÿ'’ .]{2,60}?)\s*\bCOGNOME\b\s*:?\s*([A-Za-zÀ-ÿ'’ .]{2,60}?)\s*\bDATA\s+DI\s+NASCITA\b\s*:?\s*(\d{1,2}[/.-]\d{1,2}[/.-]\d{4})(?:\s*\bSESSO\b\s*:?\s*([FM])\b)?/i

// Forma a tabella: l'intestazione finisce con SESSO e la riga dei dati segue
const TABLE_HEADER_END = /\bSESSO\b\s*:?\s*/i
const NAME_THEN_BIRTH = /^(.*?)(\d{1,2}[/.-]\d{1,2}[/.-]\d{4})\s*([FM])?\b/i

function readGender(value: string | undefined): "F" | "M" | null {
  if (!value) return null
  const g = value.trim().toUpperCase()
  return g === "F" || g === "M" ? g : null
}

function buildPerson(
  rawName: string,
  rawBirth: string,
  rawGender: string | undefined,
): ParsedCardPerson | null {
  const dateOfBirth = parseItalianDate(rawBirth)
  if (!dateOfBirth) return null
  const tokens = personTokensFromPdf(rawName)
  if (tokens.length === 0) return null
  return {
    name: normalizeSpaces(rawName.replace(/[.]/g, " ")),
    tokens,
    dateOfBirth,
    gender: readGender(rawGender),
  }
}

// L'intestatario si legge in due modi diversi a seconda di come il PDF è
// impaginato. Se non si legge in nessuno dei due la tessera resta buona: sarà
// Giuseppina ad abbinarla.
function readPerson(text: string): ParsedCardPerson | null {
  const labelled = LABELLED_PERSON.exec(text)
  if (labelled) {
    const person = buildPerson(
      `${labelled[1]} ${labelled[2]}`,
      labelled[3],
      labelled[4],
    )
    if (person) return person
  }

  const headerEnd = TABLE_HEADER_END.exec(text)
  if (headerEnd) {
    const tail = text.slice(headerEnd.index + headerEnd[0].length)
    const row = NAME_THEN_BIRTH.exec(tail)
    if (row) {
      const person = buildPerson(row[1], row[2], row[3])
      if (person) return person
    }
  }

  return null
}

function parse(rawText: string): CardParseResult {
  const text = normalizeSpaces(rawText)
  if (!text) return { ok: false, reason: "OTHER_ENTITY" }

  const card = CARD_LINE.exec(text)
  // Senza "TESSERA N° … Anno sociale …" non è una tessera ENDAS: è un altro
  // documento, non una tessera rovinata
  if (!card) return { ok: false, reason: "OTHER_ENTITY" }

  const missing: string[] = []

  const issueMatch = ISSUE_DATE.exec(text)
  const issueDate = issueMatch ? parseItalianDate(issueMatch[1]) : null
  if (!issueDate) missing.push("data iscrizione")

  const expiryMatch = EXPIRY_DATE.exec(text)
  const expiryDate = expiryMatch ? parseItalianDate(expiryMatch[1]) : null
  if (!expiryDate) missing.push("data scadenza")

  const cardYear = Number(card[3])
  if (!Number.isInteger(cardYear) || cardYear < 2000 || cardYear > 2100) {
    missing.push("anno sociale")
  }

  if (missing.length > 0 || !issueDate || !expiryDate) {
    return { ok: false, reason: "UNREADABLE", missing }
  }

  const rawType = card[2]?.trim() ?? ""
  const cardType = rawType.length > 0 ? normalizeSpaces(rawType) : null

  return {
    ok: true,
    card: {
      entity: "ENDAS",
      cardNumber: card[1],
      cardType,
      cardYear,
      issueDate,
      expiryDate,
      person: readPerson(text),
    },
  }
}

export const endasCardParser: CardParser = {
  entity: "ENDAS",
  label: "ENDAS",
  parse,
}
