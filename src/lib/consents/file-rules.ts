// Regole del modulo firmato allegato a un consenso, condivise tra Storage
// (controllo vincolante lato server) e dialog (controllo immediato nel
// browser). Le stesse dei certificati medici: un foglio fotografato o
// scansionato.

import { UPLOAD_MAX_BYTES } from "@/lib/uploads/upload-limits"

export const CONSENT_FILE_MAX_BYTES = UPLOAD_MAX_BYTES

export const CONSENT_FILE_ALLOWED_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const
