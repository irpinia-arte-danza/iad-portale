import {
  medicalCertSchema,
  type MedicalCertType,
} from "@/lib/schemas/medical-certificate"
import { dateOnly } from "@/lib/utils/date-only"

import { medicalCertFileError } from "./file-rules"

// Certificato inserito insieme alla nuova allieva. La sezione è facoltativa:
// lasciata vuota non crea nulla. Se compilata servono emissione e scadenza,
// come per il certificato caricato dalla scheda allieva.
export type NewAthleteCertificate = {
  type: MedicalCertType
  // Valori di <input type="date"> (AAAA-MM-GG), vuoti se non compilati
  issueDate: string
  expiryDate: string
  file: File | null
}

export const EMPTY_NEW_ATHLETE_CERTIFICATE: NewAthleteCertificate = {
  type: "NON_AGONISTICO",
  issueDate: "",
  expiryDate: "",
  file: null,
}

export function isNewAthleteCertificateEmpty(
  value: NewAthleteCertificate,
): boolean {
  return !value.issueDate && !value.expiryDate && !value.file
}

export function newAthleteCertificateError(
  value: NewAthleteCertificate,
): string | null {
  if (isNewAthleteCertificateEmpty(value)) return null
  if (!value.issueDate) return "Inserisci la data di emissione del certificato."
  if (!value.expiryDate) return "Inserisci la data di scadenza del certificato."
  if (value.file) {
    const fileError = medicalCertFileError(value.file)
    if (fileError) return fileError
  }
  const parsed = medicalCertSchema.safeParse({
    type: value.type,
    issueDate: new Date(value.issueDate),
    expiryDate: new Date(value.expiryDate),
    doctorName: "",
    notes: "",
  })
  if (parsed.success) return null
  return parsed.error.issues[0]?.message ?? "Dati del certificato non validi"
}

// Stessi campi che manda il dialog certificato della scheda allieva
export function newAthleteCertificateFormData(
  value: NewAthleteCertificate,
): FormData {
  const formData = new FormData()
  formData.append("type", value.type)
  formData.append("issueDate", value.issueDate)
  formData.append("expiryDate", value.expiryDate)
  if (value.file) formData.append("file", value.file)
  return formData
}

// Scadenza proposta per un certificato annuale: un anno dopo l'emissione
// (il 29/02 diventa 28/02). Stringhe AAAA-MM-GG, calcolo in UTC.
export function suggestedExpiryDate(issueDate: string): string {
  const issue = new Date(issueDate)
  const year = issue.getUTCFullYear() + 1
  const month = issue.getUTCMonth()
  const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  return dateOnly(year, month, Math.min(issue.getUTCDate(), lastDayOfMonth))
    .toISOString()
    .slice(0, 10)
}
