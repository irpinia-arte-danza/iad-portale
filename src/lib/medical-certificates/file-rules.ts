// Regole del file allegato al certificato medico, condivise tra Storage
// (controllo vincolante lato server) e form di creazione allieva (controllo
// immediato nel browser).

import { UPLOAD_MAX_BYTES, uploadSizeError } from "@/lib/uploads/upload-limits"

export const MEDICAL_CERT_MAX_BYTES = UPLOAD_MAX_BYTES

export const MEDICAL_CERT_ALLOWED_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const

export const MEDICAL_CERT_FILE_ACCEPT = ".pdf,.jpg,.jpeg,.png"

export function medicalCertFileError(file: {
  size: number
  type: string
}): string | null {
  const sizeError = uploadSizeError(file, MEDICAL_CERT_MAX_BYTES)
  if (sizeError) return sizeError
  if (!(MEDICAL_CERT_ALLOWED_MIME as readonly string[]).includes(file.type)) {
    return "Formato non supportato (PDF, JPEG, PNG)"
  }
  return null
}
