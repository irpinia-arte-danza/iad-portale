import { describe, expect, it } from "vitest"

import {
  DIGITS,
  PASSWORD_POLICY,
  SYMBOLS,
  LEAKED_PASSWORD_MESSAGE,
  LOWERCASE,
  passwordErrorMessage,
  passwordPolicyHint,
  passwordPolicyProblems,
  SAME_PASSWORD_MESSAGE,
  SESSION_EXPIRED_MESSAGE,
  UPPERCASE,
  type PasswordPolicy,
} from "./password-policy"

// I testi sono quelli che Supabase manda davvero (supabase/auth,
// internal/api/password.go), con il codice che supabase-js ci mette sopra
const weak = (message: string, reasons: string[]) => ({
  name: "AuthWeakPasswordError",
  code: "weak_password",
  status: 422,
  message,
  reasons,
})

describe("passwordErrorMessage: weak_password dice la regola vera", () => {
  it("lunghezza: il numero arriva dal messaggio di Supabase, non dal portale", () => {
    expect(passwordErrorMessage(weak("Password should be at least 12 characters.", ["length"]))).toBe(
      "La password deve avere almeno 12 caratteri.",
    )
    expect(passwordErrorMessage(weak("Password should be at least 6 characters.", ["length"]))).toBe(
      "La password deve avere almeno 6 caratteri.",
    )
  })

  it("caratteri richiesti, gruppo per gruppo", () => {
    const message = `Password should contain at least one character of each: ${LOWERCASE}, ${UPPERCASE}, ${DIGITS}, ${SYMBOLS}.`
    expect(passwordErrorMessage(weak(message, ["characters"]))).toBe(
      "La password deve avere almeno una lettera minuscola, almeno una lettera maiuscola, almeno un numero e almeno un simbolo (ad esempio ! ? # %).",
    )
    const lettersDigits = `Password should contain at least one character of each: ${LOWERCASE}${UPPERCASE}, ${DIGITS}.`
    expect(passwordErrorMessage(weak(lettersDigits, ["characters"]))).toBe(
      "La password deve avere almeno una lettera e almeno un numero.",
    )
  })

  it("password rubata: non parla di lunghezza", () => {
    const message = passwordErrorMessage(
      weak("Password is known to be weak and easy to guess, please choose a different one.", ["pwned"]),
    )
    expect(message).toBe(LEAKED_PASSWORD_MESSAGE)
    expect(message).not.toMatch(/caratteri/)
  })

  it("più motivi insieme", () => {
    const message = passwordErrorMessage(
      weak(
        `Password should be at least 10 characters. Password should contain at least one character of each: ${DIGITS}. Password is known to be weak and easy to guess, please choose a different one.`,
        ["length", "characters", "pwned"],
      ),
    )
    expect(message).toBe(
      `La password deve avere almeno 10 caratteri e almeno un numero. ${LEAKED_PASSWORD_MESSAGE}`,
    )
  })

  it("testo che non riconosciamo: quello di Supabase, non una regola inventata", () => {
    expect(passwordErrorMessage(weak("Password must be stronger.", []))).toBe(
      "Supabase non accetta questa password: Password must be stronger.",
    )
  })
})

describe("passwordErrorMessage: gli altri errori", () => {
  it("same_password", () => {
    expect(passwordErrorMessage({ code: "same_password", message: "New password should be different from the old password." })).toBe(
      SAME_PASSWORD_MESSAGE,
    )
  })

  it("sessione assente o scaduta", () => {
    expect(passwordErrorMessage({ name: "AuthSessionMissingError", message: "Auth session missing!" })).toBe(
      SESSION_EXPIRED_MESSAGE,
    )
    expect(passwordErrorMessage({ code: "session_expired" })).toBe(SESSION_EXPIRED_MESSAGE)
    expect(passwordErrorMessage({ code: "bad_jwt" })).toBe(SESSION_EXPIRED_MESSAGE)
  })

  it("reautenticazione e troppi tentativi hanno il loro messaggio", () => {
    expect(passwordErrorMessage({ code: "reauthentication_needed" })).toMatch(/accesso recente/)
    expect(passwordErrorMessage({ code: "over_request_rate_limit", status: 429 })).toMatch(/Troppi tentativi/)
  })

  it("errore sconosciuto: il messaggio reale e il codice, mai «troppo debole»", () => {
    const message = passwordErrorMessage({
      name: "AuthApiError",
      code: "unexpected_failure",
      status: 500,
      message: "Database error updating user",
    })
    expect(message).toBe(
      "Non è stato possibile salvare la password (Database error updating user — codice unexpected_failure).",
    )
    expect(message).not.toMatch(/debole|caratteri/)
  })

  it("rete giù", () => {
    expect(passwordErrorMessage({ name: "AuthRetryableFetchError", status: 0, message: "fetch failed" })).toMatch(
      /non risponde/,
    )
  })
})

describe("la regola del portale", () => {
  const policy: PasswordPolicy = {
    minLength: 8,
    requiredCharacters: [LOWERCASE + UPPERCASE, DIGITS],
    leakedPasswordCheck: true,
  }

  it("cosa manca", () => {
    expect(passwordPolicyProblems("abc", policy)).toEqual(["almeno 8 caratteri", "almeno un numero"])
    expect(passwordPolicyProblems("12345678", policy)).toEqual(["almeno una lettera"])
    expect(passwordPolicyProblems("danza2026", policy)).toEqual([])
  })

  it("la riga sotto il campo", () => {
    expect(passwordPolicyHint(policy)).toBe("Almeno 8 caratteri con una lettera e un numero.")
    expect(passwordPolicyHint({ minLength: 6, requiredCharacters: [], leakedPasswordCheck: false })).toBe(
      "Almeno 6 caratteri.",
    )
  })
})

describe("la regola configurata su Supabase (20/10/2026)", () => {
  it("10 caratteri, minuscole, maiuscole, numeri e simboli; niente controllo password rubate", () => {
    expect(PASSWORD_POLICY).toEqual({
      minLength: 10,
      requiredCharacters: [LOWERCASE, UPPERCASE, DIGITS, SYMBOLS],
      leakedPasswordCheck: false,
    })
  })

  it("i simboli sono quelli di Supabase", () => {
    expect(SYMBOLS).toBe("!@#$%^&*()_+-=[]{};'\\:\"|<>?,./`~")
  })

  it("il testo sotto il campo", () => {
    expect(passwordPolicyHint()).toBe(
      "Almeno 10 caratteri con una minuscola, una maiuscola, un numero e un simbolo.",
    )
  })

  it("la password rifiutata quando Supabase voleva 12 ora passa; le incomplete no", () => {
    expect(passwordPolicyProblems("ACAdon92.,.")).toEqual([])
    expect(passwordPolicyProblems("ACAdon92.")).toEqual(["almeno 10 caratteri"])
    expect(passwordPolicyProblems("acadonnn92.,")).toEqual(["almeno una lettera maiuscola"])
    expect(passwordPolicyProblems("ACAdonnnnn92")).toEqual(["almeno un simbolo (ad esempio ! ? # %)"])
  })
})
