import {
  medicalCertSchema,
  type MedicalCertType,
} from "@/lib/schemas/medical-certificate"
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

// Scadenza proposta: un anno dal rilascio. Il calcolo vive in
// ./default-expiry, condiviso con il dialog della scheda allieva — prima
// c'erano due implementazioni, e quella del dialog costruiva le date in ora
// locale. Il nome resta per chi la chiamava già così.
export { defaultExpiryFromIssue as suggestedExpiryDate } from "./default-expiry"
