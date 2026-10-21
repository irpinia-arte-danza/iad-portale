import type { ActionResult } from "@/lib/schemas/common"
import { logError } from "@/lib/logging/log-error"

import { formatMegabytes, UPLOAD_MAX_BYTES } from "./upload-limits"

// ─────────────────────────────────────────────────────────────────────────
// Una server action che porta un file, chiamata in modo che finisca sempre.
//
// Il bug di ottobre 2026: foto del certificato da iPad, la server action
// rifiuta il corpo («Body exceeded 1 MB limit», 500 dopo 23 s), il client di
// Next rilancia l'errore, il modulo non lo prende e la rotella gira per
// sempre. Qui ogni esito diventa un ActionResult: quello della action, o un
// errore con un messaggio in italiano. Mai una promessa che si rompe, mai
// una che non torna: dopo UPLOAD_TIMEOUT_MS si smette di aspettare.
//
// La action non si può annullare: se risponde dopo il timeout la risposta
// si ignora. Per questo il messaggio del timeout dice di ricaricare la
// pagina prima di riprovare (il file potrebbe essere stato salvato).
// ─────────────────────────────────────────────────────────────────────────

export const UPLOAD_TIMEOUT_MS = 30_000

export const UPLOAD_TIMEOUT_MESSAGE =
  "Il caricamento non ha risposto entro 30 secondi. Ricarica la pagina per vedere se è stato salvato, poi riprova."
export const UPLOAD_TOO_LARGE_MESSAGE = `Il server ha rifiutato il file perché troppo grande (massimo ${formatMegabytes(UPLOAD_MAX_BYTES)} MB).`
export const UPLOAD_NETWORK_MESSAGE =
  "Connessione interrotta durante il caricamento: controlla la rete e riprova."
// Il client di Next legge il testo dell'errore solo se la risposta è
// esattamente text/plain; un 413 di Vercel (text/plain; charset=utf-8)
// arriva come «An unexpected response…», senza codice. Per questo il
// messaggio generico nomina anche il file troppo pesante.
export const UPLOAD_SERVER_MESSAGE =
  "Il caricamento non è andato a buon fine: riprova. Se succede ancora, prova con un file più leggero o ricarica la pagina."

export class UploadTimeoutError extends Error {
  constructor() {
    super("upload timeout")
    this.name = "UploadTimeoutError"
  }
}

// L'errore che rilancia il client di Next, in una frase per Giuseppina.
// I testi arrivano da: Next («Body exceeded 1 MB limit», un 413), Vercel
// (413 FUNCTION_PAYLOAD_TOO_LARGE), il browser quando cade la rete
// (Safari «Load failed», Chrome «Failed to fetch», Firefox «NetworkError»).
export function uploadFailureMessage(error: unknown): string {
  if (error instanceof UploadTimeoutError) return UPLOAD_TIMEOUT_MESSAGE
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : ""
  if (/body exceeded|payload too large|payload_too_large|request entity too large|\b413\b/i.test(message)) {
    return UPLOAD_TOO_LARGE_MESSAGE
  }
  if (/load failed|failed to fetch|networkerror|network request failed/i.test(message)) {
    return UPLOAD_NETWORK_MESSAGE
  }
  return UPLOAD_SERVER_MESSAGE
}

export async function callUploadAction<T>(
  call: () => Promise<ActionResult<T>>,
  timeoutMs: number = UPLOAD_TIMEOUT_MS,
): Promise<ActionResult<T>> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new UploadTimeoutError()), timeoutMs)
  })
  try {
    return await Promise.race([call(), timeout])
  } catch (error) {
    logError("[upload] server action fallita", error)
    return { ok: false, error: uploadFailureMessage(error) }
  } finally {
    clearTimeout(timer)
  }
}
