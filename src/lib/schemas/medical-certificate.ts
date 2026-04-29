import { z } from "zod"

export const MEDICAL_CERT_TYPES = [
  "AGONISTICO",
  "NON_AGONISTICO",
  "IDONEITA_LUDICO",
  "ALTRO",
] as const

export type MedicalCertType = (typeof MEDICAL_CERT_TYPES)[number]

export const MEDICAL_CERT_TYPE_LABELS: Record<MedicalCertType, string> = {
  AGONISTICO: "Agonistico",
  NON_AGONISTICO: "Non agonistico",
  IDONEITA_LUDICO: "Idoneità ludico-ricreativa",
  ALTRO: "Altro",
}

// Backward compat: record DB pre-Fase 1.B hanno type=String legacy
// (es. "non-agonistica" lowercase). Mapping read-time per display.
const LEGACY_MAP: Record<string, MedicalCertType> = {
  "non-agonistica": "NON_AGONISTICO",
  "agonistica": "AGONISTICO",
  "ludico": "IDONEITA_LUDICO",
}

// Normalizza qualsiasi stringa DB a un valore enum app-side.
// Fallback ad ALTRO se non riconosciuta.
export function normalizeCertType(raw: string): MedicalCertType {
  if ((MEDICAL_CERT_TYPES as readonly string[]).includes(raw)) {
    return raw as MedicalCertType
  }
  const legacy = LEGACY_MAP[raw.toLowerCase()]
  if (legacy) return legacy
  return "ALTRO"
}

export const medicalCertSchema = z
  .object({
    type: z.enum(MEDICAL_CERT_TYPES, { message: "Tipo non valido" }),
    issueDate: z.date({ message: "Data emissione non valida" }),
    expiryDate: z.date({ message: "Data scadenza non valida" }),
    doctorName: z
      .string()
      .trim()
      .max(120)
      .optional()
      .or(z.literal("")),
    notes: z
      .string()
      .trim()
      .max(500)
      .optional()
      .or(z.literal("")),
  })
  .refine((d) => d.expiryDate > d.issueDate, {
    message: "Data scadenza deve essere successiva a emissione",
    path: ["expiryDate"],
  })

export type MedicalCertValues = z.infer<typeof medicalCertSchema>

// Status classification per badge UI: missing | expired | expiring | valid
export type CertStatus = "missing" | "expired" | "expiring" | "valid"

export const EXPIRY_WARN_DAYS = 30

export function classifyCert(expiry: Date | null | undefined): CertStatus {
  if (!expiry) return "missing"
  const now = new Date()
  const expiryDate = new Date(expiry)
  if (expiryDate < now) return "expired"
  const diffDays =
    (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  if (diffDays <= EXPIRY_WARN_DAYS) return "expiring"
  return "valid"
}
