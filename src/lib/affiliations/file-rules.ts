// Regole del PDF della tessera, condivise tra Storage (controllo vincolante
// lato server) e dropzone del caricamento multiplo (controllo immediato nel
// browser, prima ancora di spedire i file).
//
// Solo PDF: la tessera arriva dal portale dell'ente ed è testo vero, non una
// scansione. Una foto della tessera non si può leggere e non si può abbinare.

import { UPLOAD_MAX_BYTES, uploadSizeError } from "@/lib/uploads/upload-limits"

export const CARD_MAX_BYTES = UPLOAD_MAX_BYTES

export const CARD_ALLOWED_MIME = ["application/pdf"] as const

export const CARD_FILE_ACCEPT = ".pdf"

// Un lotto intero di tessere: una trentina di file, con margine
export const CARD_MAX_FILES_PER_BATCH = 60

export function cardFileError(file: {
  size: number
  type: string
  name: string
}): string | null {
  if (file.size === 0) return "File vuoto"
  const sizeError = uploadSizeError(file, CARD_MAX_BYTES)
  if (sizeError) return sizeError
  const looksPdf =
    (CARD_ALLOWED_MIME as readonly string[]).includes(file.type) ||
    file.name.toLowerCase().endsWith(".pdf")
  if (!looksPdf) return "Formato non supportato: serve il PDF della tessera"
  return null
}
