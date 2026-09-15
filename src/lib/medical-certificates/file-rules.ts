// Regole del file allegato al certificato medico, condivise tra Storage
// (controllo vincolante lato server) e form di creazione allieva (controllo
// immediato nel browser).

export const MEDICAL_CERT_MAX_BYTES = 3 * 1024 * 1024 // 3 MB

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
  if (file.size > MEDICAL_CERT_MAX_BYTES) return "File troppo grande (max 3 MB)"
  if (!(MEDICAL_CERT_ALLOWED_MIME as readonly string[]).includes(file.type)) {
    return "Formato non supportato (PDF, JPEG, PNG)"
  }
  return null
}
