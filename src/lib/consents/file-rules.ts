// Regole del modulo firmato allegato a un consenso, condivise tra Storage
// (controllo vincolante lato server) e dialog (controllo immediato nel
// browser). Le stesse dei certificati medici: un foglio fotografato o
// scansionato.

export const CONSENT_FILE_MAX_BYTES = 3 * 1024 * 1024 // 3 MB

export const CONSENT_FILE_ALLOWED_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const
