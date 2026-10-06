// ─────────────────────────────────────────────────────────────────────────
// Cosa dire a chi ha premuto il tasto quando qualcosa va storto.
//
// Due famiglie di errori. Quelli che sono una risposta per la persona
// («File troppo grande (max 3 MB)», «Il contenuto del file non è un PDF»):
// UserFacingError, il messaggio è scritto per essere letto. Tutti gli altri
// — Storage che non risponde, Prisma, bug — hanno messaggi tecnici che a
// Giuseppina non dicono niente e a un estraneo dicono troppo: il toast
// riceve una frase fissa e il dettaglio va nei log (logError).
// ─────────────────────────────────────────────────────────────────────────

export const GENERIC_ERROR_MESSAGE = "Operazione non riuscita, riprova"

export class UserFacingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "UserFacingError"
  }
}

export function userFacingMessage(error: unknown): string {
  return error instanceof UserFacingError ? error.message : GENERIC_ERROR_MESSAGE
}
