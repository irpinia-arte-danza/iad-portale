import {
  electronicFormatIBAN,
  friendlyFormatIBAN,
  validateIBAN,
} from "ibantools"
import { z } from "zod"

// ============================================================================
// Partita IVA italiana: 11 cifre numeriche, controllo Luhn-like
// ============================================================================
export function isValidItalianVat(vat: string): boolean {
  const normalized = vat.replace(/\s/g, "")
  if (!/^\d{11}$/.test(normalized)) return false

  let sum = 0
  for (let i = 0; i < 11; i++) {
    const digit = Number.parseInt(normalized[i]!, 10)
    if (i % 2 === 0) {
      sum += digit
    } else {
      const doubled = digit * 2
      sum += doubled > 9 ? doubled - 9 : doubled
    }
  }
  return sum % 10 === 0
}

export const italianVatSchema = z
  .string()
  .trim()
  .refine((v) => v === "" || isValidItalianVat(v), {
    message: "Partita IVA non valida (11 cifre)",
  })
  .optional()
  .or(z.literal(""))

// ============================================================================
// SDI (Sistema di Interscambio): 7 caratteri alfanumerici per soggetti
// aderenti al SdI, oppure "0000000" placeholder
// ============================================================================
export const sdiCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{7}$/, {
    message: "Codice SDI: 7 caratteri alfanumerici (es. 0000000)",
  })
  .optional()
  .or(z.literal(""))

// ============================================================================
// IBAN via ibantools
// ============================================================================
export function normalizeIban(input: string): string {
  return electronicFormatIBAN(input) ?? ""
}

export function prettyIban(input: string): string {
  return friendlyFormatIBAN(input) ?? ""
}

export const ibanSchema = z
  .string()
  .trim()
  .refine(
    (v) => {
      if (v === "") return true
      const result = validateIBAN(electronicFormatIBAN(v) ?? "")
      return result.valid
    },
    { message: "IBAN non valido" },
  )
  .optional()
  .or(z.literal(""))

// ============================================================================
// PEC: email con TLD specifico, tollerante — validiamo solo come email
// ============================================================================
export const pecSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email({ message: "PEC non valida" })
  .optional()
  .or(z.literal(""))

// ============================================================================
// CAP
// ============================================================================
export const capSchema = z
  .string()
  .trim()
  .regex(/^\d{5}$/, { message: "CAP: 5 cifre" })
  .optional()
  .or(z.literal(""))

// ============================================================================
// Sigla provincia
// ============================================================================
export const provinceSchema = z
  .string()
  .trim()
  .length(2, { message: "Provincia: 2 lettere" })
  .toUpperCase()
  .optional()
  .or(z.literal(""))

// ============================================================================
// Codice fiscale persona fisica — riusiamo da common.ts
// Codice fiscale ASD/persona giuridica: 11 cifre (= Partita IVA)
// Distinzione:
//  - persona fisica: 16 char
//  - persona giuridica: 11 cifre
// ============================================================================
export const organizationFiscalCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine(
    (v) => {
      if (v === "") return false
      if (/^\d{11}$/.test(v)) return isValidItalianVat(v)
      return /^[A-Z]{6}\d{2}[ABCDEHLMPRST]\d{2}[A-Z]\d{3}[A-Z]$/.test(v)
    },
    {
      message:
        "Codice fiscale ASD: 11 cifre (persona giuridica) o 16 caratteri (persona fisica)",
    },
  )

// ============================================================================
// Hex color (#RRGGBB)
// ============================================================================
export const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, { message: "Colore HEX: #RRGGBB" })
