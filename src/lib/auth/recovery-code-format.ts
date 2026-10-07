import { randomInt } from "node:crypto"

// ─────────────────────────────────────────────────────────────────────────
// I codici di recupero: forma e generazione. Otto codici, uno vale una
// volta. Lettere e cifre senza quelle che si confondono a voce o a mano
// (niente 0/O, 1/I): si leggono al telefono e si scrivono da un foglio.
// La parte che tocca il database (hash, consumo) sta in recovery-codes.ts.
// ─────────────────────────────────────────────────────────────────────────

export const RECOVERY_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
export const RECOVERY_CODE_LENGTH = 8
export const RECOVERY_CODES_COUNT = 8

export function generateRecoveryCode(): string {
  let raw = ""
  for (let i = 0; i < RECOVERY_CODE_LENGTH; i++) {
    raw += RECOVERY_CODE_ALPHABET[randomInt(RECOVERY_CODE_ALPHABET.length)]
  }
  return `${raw.slice(0, 4)}-${raw.slice(4)}`
}

export function generateRecoveryCodes(count: number = RECOVERY_CODES_COUNT): string[] {
  const codes = new Set<string>()
  while (codes.size < count) codes.add(generateRecoveryCode())
  return [...codes]
}

// Quello che la persona scrive: minuscole, spazi, trattini in più, lettere
// confondibili. Si riporta alla forma XXXX-XXXX; null se non può essere un
// codice.
export function normalizeRecoveryCode(input: string): string | null {
  const raw = input
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .replace(/0/g, "O")
    .replace(/1/g, "I")
  if (raw.length !== RECOVERY_CODE_LENGTH) return null
  // O e I non sono nell'alfabeto: un codice vero non li contiene, quindi
  // una lettura "O" al posto di "Q" resta sbagliata e il confronto fallisce
  return `${raw.slice(0, 4)}-${raw.slice(4)}`
}
