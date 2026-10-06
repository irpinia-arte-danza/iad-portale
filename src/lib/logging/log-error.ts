// ─────────────────────────────────────────────────────────────────────────
// Un errore nei log, senza i dati che si porta dietro.
//
// `console.error("…", error)` scrive l'oggetto intero: per un errore Prisma
// vuol dire la query con i valori (nomi, codici fiscali), per un errore di
// rete gli header. Nei log di Vercel li legge chiunque abbia accesso al
// progetto. Qui si tiene quello che serve a capire cos'è successo — il
// codice dell'errore, i campi coinvolti, il nome dell'eccezione — e per gli
// errori non di Prisma il messaggio, che non contiene dati.
//
// Niente import di Prisma: il modulo lo usano anche i componenti client, e
// un errore Prisma si riconosce dalla forma (code P1234, meta.target).
// ─────────────────────────────────────────────────────────────────────────

export type ErrorSummary = {
  name: string
  // Codice Prisma (P2002…) o codice di un errore di sistema (ECONNREFUSED)
  code?: string
  // I campi coinvolti (meta.target di Prisma), mai i valori
  target?: string[]
  // Solo per errori non di Prisma: il messaggio non porta dati della query
  message?: string
}

type ErrorLike = {
  name?: unknown
  code?: unknown
  meta?: unknown
  message?: unknown
}

const PRISMA_CODE = /^P\d{4}$/

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

export function describeError(error: unknown): ErrorSummary {
  if (!isObject(error)) {
    return { name: typeof error, message: String(error).slice(0, 200) }
  }
  const e = error as ErrorLike
  const name = typeof e.name === "string" ? e.name : "Error"
  const code = typeof e.code === "string" ? e.code : undefined
  const summary: ErrorSummary = { name }
  if (code) summary.code = code

  if (code && PRISMA_CODE.test(code)) {
    // Errore Prisma: il messaggio ripete la query, non si logga
    const target = isObject(e.meta) ? e.meta.target : undefined
    if (Array.isArray(target)) {
      summary.target = target.filter((t): t is string => typeof t === "string")
    } else if (typeof target === "string") {
      summary.target = [target]
    }
    return summary
  }

  if (typeof e.message === "string" && e.message.length > 0) {
    summary.message = e.message.slice(0, 300)
  }
  return summary
}

/**
 * Scrive nei log un contesto («[cestino action] error»), i dettagli extra
 * passati dal chiamante (id, non dati personali) e il riassunto dell'errore.
 */
export function logError(
  context: string,
  error: unknown,
  extra?: Record<string, unknown>,
): void {
  console.error(context, { ...(extra ?? {}), error: describeError(error) })
}
