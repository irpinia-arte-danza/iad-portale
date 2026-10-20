// ─────────────────────────────────────────────────────────────────────────
// La regola delle password e gli errori di Supabase quando si salva.
//
// La regola vera è quella configurata su Supabase (Authentication › Sign In
// / Providers › Email): è Supabase che rifiuta una password. Qui ce n'è una
// copia, PASSWORD_POLICY, perché il modulo possa dirlo prima di inviare;
// se la si cambia in dashboard va cambiata anche qui (docs/runbook.md).
// Anche se le due copie divergono, il messaggio resta giusto: per
// weak_password si legge la regola dal testo di Supabase, non da qui.
//
// Prima ogni errore «debole» diceva «usa almeno 10 caratteri», anche quando
// il motivo era un altro (password nelle liste di quelle rubate, caratteri
// mancanti), e gli errori sconosciuti diventavano un generico «riprova».
// ─────────────────────────────────────────────────────────────────────────

export type PasswordPolicy = {
  minLength: number
  // Come nella configurazione di Supabase: gruppi di caratteri, da ognuno
  // dei quali serve almeno un carattere
  requiredCharacters: readonly string[]
  // «Leaked password protection» (HaveIBeenPwned): la controlla solo
  // Supabase, il portale non ha l'elenco
  leakedPasswordCheck: boolean
}

export const LOWERCASE = "abcdefghijklmnopqrstuvwxyz"
export const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
export const DIGITS = "0123456789"
// I simboli di Supabase per «Lowercase, uppercase letters, digits and symbols»
export const SYMBOLS = "!@#$%^&*()_+-=[]{};'\\:\"|<>?,./`~"

// Copia della configurazione Supabase del progetto (vedi in cima e
// docs/runbook.md). Al 20/10/2026: minimo 10 caratteri (prima era 12 su
// Supabase e 10 qui: una password da 11 passava il modulo e Supabase la
// rifiutava), minuscole, maiuscole, numeri e simboli; protezione password
// compromesse spenta (piano Free)
export const PASSWORD_POLICY: PasswordPolicy = {
  minLength: 10,
  requiredCharacters: [LOWERCASE, UPPERCASE, DIGITS, SYMBOLS],
  leakedPasswordCheck: false,
}

// Massimo di bcrypt, uguale per tutti i progetti Supabase
export const PASSWORD_MAX_LENGTH = 72

// Un gruppo di caratteri detto a parole. Breve per la riga sotto il campo
// («una minuscola»), completo negli errori («una lettera minuscola»).
export function describeCharacterGroup(group: string, short = false): string {
  const has = (set: string) => [...set].some((c) => group.includes(c))
  const lower = has(LOWERCASE)
  const upper = has(UPPERCASE)
  const digit = has(DIGITS)
  const other = [...group].some(
    (c) => !LOWERCASE.includes(c) && !UPPERCASE.includes(c) && !DIGITS.includes(c),
  )
  if (lower && upper && !digit && !other) return "una lettera"
  if (lower && !upper && !digit && !other) return short ? "una minuscola" : "una lettera minuscola"
  if (upper && !lower && !digit && !other) return short ? "una maiuscola" : "una lettera maiuscola"
  if (digit && !lower && !upper && !other) return "un numero"
  if (other && !lower && !upper && !digit) return short ? "un simbolo" : "un simbolo (ad esempio ! ? # %)"
  return `uno di questi caratteri: ${group}`
}

function joinItalian(items: string[]): string {
  if (items.length <= 1) return items.join("")
  return `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`
}

// La riga sotto i campi del modulo
export function passwordPolicyHint(policy: PasswordPolicy = PASSWORD_POLICY): string {
  const length = `Almeno ${policy.minLength} caratteri`
  if (policy.requiredCharacters.length === 0) return `${length}.`
  const groups = policy.requiredCharacters.map((group) => describeCharacterGroup(group, true))
  return `${length} con ${joinItalian(groups)}.`
}

// Cosa manca a una password per la regola del portale: vuoto se va bene
export function passwordPolicyProblems(
  password: string,
  policy: PasswordPolicy = PASSWORD_POLICY,
): string[] {
  const problems: string[] = []
  if (password.length < policy.minLength) {
    problems.push(`almeno ${policy.minLength} caratteri`)
  }
  for (const group of policy.requiredCharacters) {
    if (![...password].some((c) => group.includes(c))) {
      problems.push(`almeno ${describeCharacterGroup(group)}`)
    }
  }
  return problems
}

export function policyMessage(problems: string[]): string {
  return `La password deve avere ${joinItalian(problems)}.`
}

// ── Errori di Supabase ────────────────────────────────────────────────────

export const SESSION_EXPIRED_MESSAGE =
  "La sessione è scaduta. Richiedi un nuovo link da «Password dimenticata»."

export const LEAKED_PASSWORD_MESSAGE =
  "Questa password compare negli elenchi di password rubate in altri siti: scegline un'altra."

export const SAME_PASSWORD_MESSAGE =
  "La nuova password deve essere diversa da quella precedente."

// La forma che serve dell'errore di supabase-js (AuthError e sottoclassi)
export type PasswordAuthError = {
  code?: string
  name?: string
  message?: string
  status?: number
  reasons?: readonly string[]
}

// Il testo di Supabase per weak_password, frase per frase (supabase/auth,
// internal/api/password.go):
//   "Password should be at least 10 characters."
//   "Password should contain at least one character of each: abc…, ABC…, 012…."
//   "Password is known to be weak and easy to guess, please choose a different one."
// Più motivi arrivano nello stesso messaggio, uno dopo l'altro.
export function weakPasswordMessage(error: PasswordAuthError): string {
  const text = error.message ?? ""
  const problems: string[] = []

  const length = /at least (\d+) characters/i.exec(text)
  if (length) problems.push(`almeno ${length[1]} caratteri`)

  const chars = /at least one character of each:\s*(.+?)\.(?:\s|$)/i.exec(text)
  if (chars) {
    for (const group of chars[1].split(/,\s+/)) {
      if (group.length > 0) problems.push(`almeno ${describeCharacterGroup(group)}`)
    }
  }

  const reasons = error.reasons ?? []
  const leaked = reasons.includes("pwned") || /known to be weak|pwned|leaked/i.test(text)

  const sentences: string[] = []
  if (problems.length > 0) sentences.push(policyMessage(problems))
  if (leaked) sentences.push(LEAKED_PASSWORD_MESSAGE)
  if (sentences.length > 0) return sentences.join(" ")

  // weak_password con un testo che non riconosciamo: quello di Supabase
  return text
    ? `Supabase non accetta questa password: ${text}`
    : "Supabase non accetta questa password: scegline una più lunga o più varia."
}

const SESSION_CODES = new Set([
  "session_not_found",
  "session_expired",
  "bad_jwt",
  "no_authorization",
  "user_not_found",
])

// Un errore, un messaggio. Gli errori che non conosciamo escono con il loro
// testo e il codice, così chi lo vede può riferirlo invece di riprovare
// all'infinito.
export function passwordErrorMessage(error: PasswordAuthError): string {
  if (error.code === "weak_password" || error.name === "AuthWeakPasswordError") {
    return weakPasswordMessage(error)
  }
  if (error.code === "same_password") return SAME_PASSWORD_MESSAGE
  if (
    (error.code && SESSION_CODES.has(error.code)) ||
    error.name === "AuthSessionMissingError"
  ) {
    return SESSION_EXPIRED_MESSAGE
  }
  if (error.code === "reauthentication_needed") {
    return "Per cambiare la password serve un accesso recente: esci, rientra e riprova."
  }
  if (error.code === "over_request_rate_limit" || error.status === 429) {
    return "Troppi tentativi in poco tempo: aspetta qualche minuto e riprova."
  }
  if (error.name === "AuthRetryableFetchError") {
    return "Supabase non risponde: controlla la connessione e riprova."
  }
  const detail = [error.message, error.code ? `codice ${error.code}` : null]
    .filter(Boolean)
    .join(" — ")
  return detail
    ? `Non è stato possibile salvare la password (${detail}).`
    : "Non è stato possibile salvare la password, riprova."
}
