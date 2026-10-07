import "server-only"

import { cache } from "react"
import { cookies } from "next/headers"

import type { SupabaseClient } from "@supabase/supabase-js"

import { logError } from "@/lib/logging/log-error"
import { createAdminClient } from "@/lib/supabase/admin-client"
import { createClient } from "@/lib/supabase/server"

import { sessionLevelFromClaims, type SessionLevel } from "./mfa-gate"
import {
  RECOVERY_PASS_COOKIE,
  RECOVERY_PASS_HOURS,
  recoveryPassKey,
  signRecoveryPass,
  verifyRecoveryPass,
} from "./mfa-recovery-pass"
import { deleteRecoveryCodes } from "./recovery-codes"

// ─────────────────────────────────────────────────────────────────────────
// Il secondo fattore (TOTP di Supabase Auth) visto dal server.
//
// Qui stanno le chiamate a Supabase: livello della sessione (aal) letto dal
// JWT, fattori dell'utente, iscrizione e verifica, azzeramento da parte
// dell'altro admin con la service role. La decisione «basta o no» è in
// mfa-gate.ts, pura e testata.
// ─────────────────────────────────────────────────────────────────────────

// Il payload del JWT della sessione, senza verificarne la firma: lo si
// legge solo DOPO che getUser() ha fatto verificare la sessione a Supabase
// (un token manomesso non arriva fin qui). Evita una chiamata di rete in
// più per ogni richiesta.
export function decodeJwtPayload(token: string): unknown {
  const part = token.split(".")[1]
  if (!part) return null
  try {
    return JSON.parse(Buffer.from(part, "base64url").toString("utf8"))
  } catch {
    return null
  }
}

export async function sessionLevelOf(
  supabase: Pick<SupabaseClient, "auth">,
): Promise<SessionLevel> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return sessionLevelFromClaims(session ? decodeJwtPayload(session.access_token) : null)
}

// Memoizzato per request, come getCurrentAccount
export const getSessionLevel = cache(async (): Promise<SessionLevel> => {
  const supabase = await createClient()
  return sessionLevelOf(supabase)
})

function passKey(): Buffer {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) throw new Error("SUPABASE_SERVICE_ROLE_KEY mancante: lasciapassare non firmabile")
  return recoveryPassKey(secret)
}

export async function hasRecoveryPass(
  userId: string,
  sessionId: string | null,
): Promise<boolean> {
  const jar = await cookies()
  return verifyRecoveryPass(passKey(), jar.get(RECOVERY_PASS_COOKIE)?.value, userId, sessionId)
}

export function recoveryPassIsValid(
  value: string | undefined,
  userId: string,
  sessionId: string | null,
): boolean {
  return verifyRecoveryPass(passKey(), value, userId, sessionId)
}

// Da chiamare in una server action: il cookie si scrive nella risposta.
// Insieme parte l'avviso «ti restano n codici»: quando una action scrive un
// cookie, Next rifà il rendering della pagina, e /verifica-2fa con il
// lasciapassare valido manderebbe subito alla dashboard. L'avviso vive in
// un secondo cookie, breve, che la pagina legge e il tasto «Continua» toglie.
export async function issueRecoveryPass(
  userId: string,
  sessionId: string,
  remainingCodes: number,
): Promise<void> {
  const expiresAt = Date.now() + RECOVERY_PASS_HOURS * 3_600_000
  const jar = await cookies()
  const secure = process.env.NODE_ENV === "production"
  jar.set(RECOVERY_PASS_COOKIE, signRecoveryPass(passKey(), userId, sessionId, expiresAt), {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  })
  jar.set(RECOVERY_NOTICE_COOKIE, String(remainingCodes), {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  })
}

export const RECOVERY_NOTICE_COOKIE = "iad_mfa_notice"

// Quanti codici restano, se un codice di recupero è appena stato usato
export async function pendingRecoveryNotice(): Promise<number | null> {
  const jar = await cookies()
  const raw = jar.get(RECOVERY_NOTICE_COOKIE)?.value
  if (raw === undefined || !/^\d{1,2}$/.test(raw)) return null
  return Number(raw)
}

export async function clearRecoveryNotice(): Promise<void> {
  const jar = await cookies()
  jar.delete(RECOVERY_NOTICE_COOKIE)
}

export type TotpFactor = { id: string; friendlyName: string | null }

// Il fattore TOTP verificato dell'utente della sessione, se c'è
export async function verifiedTotpFactor(
  supabase: Pick<SupabaseClient, "auth">,
): Promise<TotpFactor | null> {
  const { data, error } = await supabase.auth.mfa.listFactors()
  if (error || !data) {
    if (error) logError("[mfa] listFactors failed", error)
    return null
  }
  const verified = data.totp.find((f) => f.status === "verified")
  return verified ? { id: verified.id, friendlyName: verified.friendly_name ?? null } : null
}

export type EnrollmentStart = {
  factorId: string
  // SVG come data URL, pronto per <img src>
  qrCode: string
  // Il segreto da scrivere a mano se la fotocamera non legge il QR
  secret: string
}

// Inizia (o ricomincia) l'iscrizione: i fattori rimasti a metà da un
// tentativo precedente si tolgono, così non si accumulano
export async function beginTotpEnrollment(
  supabase: Pick<SupabaseClient, "auth">,
  friendlyName: string,
): Promise<EnrollmentStart | null> {
  const { data: factors } = await supabase.auth.mfa.listFactors()
  for (const stale of factors?.all.filter((f) => f.status !== "verified") ?? []) {
    await supabase.auth.mfa.unenroll({ factorId: stale.id })
  }
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName,
  })
  if (error || !data) {
    if (error) logError("[mfa] enroll failed", error)
    return null
  }
  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret }
}

export type VerifyOutcome = "ok" | "wrong-code" | "error"

// Verifica un codice a sei cifre: se passa, Supabase porta la sessione a
// aal2 (e, all'iscrizione, segna il fattore come verificato)
export async function verifyTotpCode(
  supabase: Pick<SupabaseClient, "auth">,
  factorId: string,
  code: string,
): Promise<VerifyOutcome> {
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
  if (!error) return "ok"
  // Supabase: codice sbagliato → mfa_verification_failed; altro → tecnico
  if (error.code === "mfa_verification_failed" || /invalid|expired/i.test(error.message)) {
    return "wrong-code"
  }
  logError("[mfa] verify failed", { name: "AuthError", code: error.code })
  return "error"
}

// L'admin (service role) vede e toglie i fattori di un altro utente: è la
// via d'uscita se l'iPad si perde
export async function adminListFactors(userId: string): Promise<{ id: string; status: string }[]> {
  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.mfa.listFactors({ userId })
  if (error || !data) {
    if (error) logError("[mfa] admin listFactors failed", error, { userId })
    return []
  }
  return data.factors.map((f) => ({ id: f.id, status: f.status }))
}

export async function adminHasVerifiedFactor(userId: string): Promise<boolean> {
  return (await adminListFactors(userId)).some((f) => f.status === "verified")
}

export async function adminResetSecondFactor(
  userId: string,
): Promise<{ factorsRemoved: number; codesRemoved: number }> {
  const admin = createAdminClient()
  const factors = await adminListFactors(userId)
  for (const factor of factors) {
    const { error } = await admin.auth.admin.mfa.deleteFactor({ id: factor.id, userId })
    if (error) throw new Error(`deleteFactor ${factor.id}: ${error.message}`)
  }
  const codesRemoved = await deleteRecoveryCodes(userId)
  return { factorsRemoved: factors.length, codesRemoved }
}

// Dopo la verifica di un fattore NUOVO, i vecchi (iPad perso, sostituito)
// si tolgono con la service role: l'utente da solo potrebbe farlo solo con
// aal2, che ha appena ottenuto, ma così non dipende dal client
export async function adminRemoveOtherFactors(userId: string, keepFactorId: string): Promise<number> {
  const admin = createAdminClient()
  let removed = 0
  for (const factor of await adminListFactors(userId)) {
    if (factor.id === keepFactorId) continue
    const { error } = await admin.auth.admin.mfa.deleteFactor({ id: factor.id, userId })
    if (!error) removed += 1
  }
  return removed
}
