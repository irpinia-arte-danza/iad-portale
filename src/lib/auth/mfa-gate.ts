import { UserRole } from "@prisma/client"

// ─────────────────────────────────────────────────────────────────────────
// Il secondo fattore degli admin: dove si decide.
//
// Supabase Auth scrive nel JWT il livello della sessione: `aal1` dopo la
// password, `aal2` dopo il codice TOTP. Per il ruolo ADMIN una sessione
// aal1 non è un admin: è qualcuno che ha superato il primo passaggio e deve
// fare il secondo. Questa è l'unica funzione che lo decide; la usano
// requireAdmin() (pagine, query, action) e il proxy (prima che una pagina
// parta). Genitori, insegnanti e allieve non hanno il secondo fattore in
// questa versione: per loro aal1 basta, come oggi.
//
// Il codice di recupero non passa da Supabase (che non lo prevede): dopo
// averlo usato il portale rilascia un «lasciapassare» firmato, legato alla
// sessione (mfa-recovery-pass.ts), che qui vale come aal2.
// ─────────────────────────────────────────────────────────────────────────

export type AuthenticatorLevel = "aal1" | "aal2"

export type SessionLevel = {
  aal: AuthenticatorLevel
  // Il claim session_id del JWT: identifica la sessione, cambia a ogni login
  sessionId: string | null
}

export const MFA_VERIFY_PATH = "/verifica-2fa"
export const MFA_ENROLL_PATH = "/imposta-2fa"

// Dal JWT (getClaims) al livello: tutto ciò che non è esplicitamente aal2
// è aal1
export function sessionLevelFromClaims(claims: unknown): SessionLevel {
  if (!claims || typeof claims !== "object") return { aal: "aal1", sessionId: null }
  const c = claims as { aal?: unknown; session_id?: unknown }
  return {
    aal: c.aal === "aal2" ? "aal2" : "aal1",
    sessionId: typeof c.session_id === "string" ? c.session_id : null,
  }
}

export type AdminGateInput = {
  role: UserRole
  aal: AuthenticatorLevel
  // Un codice di recupero usato in questa sessione (lasciapassare valido)
  recoveryPass: boolean
}

export type AdminGateResult = "ok" | "second-factor"

export function adminGate(input: AdminGateInput): AdminGateResult {
  if (input.role !== UserRole.ADMIN) return "ok"
  return input.aal === "aal2" || input.recoveryPass ? "ok" : "second-factor"
}
