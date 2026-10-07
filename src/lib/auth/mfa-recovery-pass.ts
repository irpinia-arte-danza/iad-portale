import { createHmac, timingSafeEqual } from "node:crypto"

// ─────────────────────────────────────────────────────────────────────────
// Il lasciapassare dopo un codice di recupero.
//
// Supabase non conosce i codici di recupero: dopo averne accettato uno la
// sessione resta aal1. Il portale allora firma un cookie legato a QUESTA
// sessione (userId + session_id del JWT + scadenza) e adminGate lo conta
// come secondo fattore. Muore con la sessione (il session_id cambia a ogni
// login) e comunque dopo RECOVERY_PASS_HOURS. La chiave di firma deriva
// dalla service role key, che è già un segreto solo del server.
// ─────────────────────────────────────────────────────────────────────────

export const RECOVERY_PASS_COOKIE = "iad_mfa_pass"
export const RECOVERY_PASS_HOURS = 12

export function recoveryPassKey(secret: string): Buffer {
  return createHmac("sha256", secret).update("iad-mfa-recovery-pass").digest()
}

function sign(key: Buffer, payload: string): string {
  return createHmac("sha256", key).update(payload).digest("base64url")
}

export function signRecoveryPass(
  key: Buffer,
  userId: string,
  sessionId: string,
  expiresAt: number,
): string {
  const payload = `${userId}.${sessionId}.${expiresAt}`
  return `${payload}.${sign(key, payload)}`
}

export function verifyRecoveryPass(
  key: Buffer,
  value: string | undefined | null,
  userId: string,
  sessionId: string | null,
  now: number = Date.now(),
): boolean {
  if (!value || !sessionId) return false
  const parts = value.split(".")
  if (parts.length !== 4) return false
  const [uid, sid, expRaw, signature] = parts
  const exp = Number(expRaw)
  if (!Number.isFinite(exp) || exp <= now) return false
  if (uid !== userId || sid !== sessionId) return false
  const expected = Buffer.from(sign(key, `${uid}.${sid}.${expRaw}`))
  const presented = Buffer.from(signature)
  return expected.length === presented.length && timingSafeEqual(expected, presented)
}
