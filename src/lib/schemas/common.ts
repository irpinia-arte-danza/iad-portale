import { z } from "zod"

// UUIDs
export const uuidSchema = z.string().uuid({
  message: "Identificativo non valido",
})

// Email optional (Parent può non avere email)
export const emailOptionalSchema = z
  .string()
  .email({ message: "Email non valida" })
  .optional()
  .or(z.literal(""))

// Email required
export const emailRequiredSchema = z
  .string()
  .min(1, { message: "Email obbligatoria" })
  .email({ message: "Email non valida" })

// Phone italiano (regex condivisa)
const PHONE_REGEX =
  /^(\+39)?\s?3\d{2}\s?\d{6,7}$|^(\+39)?\s?0\d{1,3}\s?\d{5,10}$/
const PHONE_MESSAGE = "Telefono non valido (es. +39 333 1234567)"

// Phone italiano (optional)
export const phoneSchema = z
  .string()
  .regex(PHONE_REGEX, { message: PHONE_MESSAGE })
  .optional()
  .or(z.literal(""))

// Phone italiano (required)
export const phoneRequiredSchema = z
  .string()
  .min(1, { message: "Telefono obbligatorio" })
  .regex(PHONE_REGEX, { message: PHONE_MESSAGE })

// Codice fiscale italiano (opzionale, 16 chars alfanumerici)
export const fiscalCodeSchema = z
  .string()
  .regex(
    /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/i,
    { message: "Codice fiscale non valido" }
  )
  .transform((v) => v.toUpperCase())
  .optional()
  .or(z.literal(""))

// Stringa non vuota (nome, cognome)
export const nonEmptyStringSchema = (fieldLabel: string) =>
  z.string().min(1, { message: `${fieldLabel} obbligatorio` }).trim()

// Result helper per server actions (UI-side error handling senza throw)
export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string }

// Upper bound per Zod .max() su date da <Input type="date"> — evita il
// border bug in cui il midnight UTC del picker viene rigettato come futuro.
export function endOfToday(): Date {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d
}
