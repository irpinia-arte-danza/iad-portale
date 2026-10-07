"use server"

import { z } from "zod"

import { redirect } from "next/navigation"

import { getDashboardPath } from "@/lib/auth/dashboard-path"
import {
  attemptEmail,
  attemptsBlockedUntil,
  clientIp,
  recordLoginAttempt,
  TOO_MANY_ATTEMPTS_MESSAGE,
} from "@/lib/auth/login-attempts"
import {
  clearRecoveryNotice,
  getSessionLevel,
  issueRecoveryPass,
  verifiedTotpFactor,
  verifyTotpCode,
} from "@/lib/auth/mfa"
import { MFA_ENROLL_PATH, MFA_VERIFY_PATH } from "@/lib/auth/mfa-gate"
import { consumeRecoveryCode } from "@/lib/auth/recovery-codes"
import { requireAdminFirstFactor } from "@/lib/auth/require-admin"
import { GENERIC_ERROR_MESSAGE } from "@/lib/errors"
import type { ActionResult } from "@/lib/schemas/common"
import { createClient } from "@/lib/supabase/server"

// ─────────────────────────────────────────────────────────────────────────
// Il secondo passaggio del login di un admin: i sei numeri dell'app, oppure
// un codice di recupero. Un codice sbagliato conta come tentativo di login
// (stessa tabella e stesso blocco di 15 minuti dopo 5).
// ─────────────────────────────────────────────────────────────────────────

const totpSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, { message: "Scrivi i sei numeri che compaiono nell'app" }),
})

const recoverySchema = z.object({
  code: z.string().trim().min(8, { message: "Scrivi un codice di recupero" }).max(20),
})

const WRONG_CODE = "Il codice non corrisponde. Aspetta che nell'app compaia il prossimo e riprova."
const WRONG_RECOVERY_CODE = "Questo codice di recupero non vale: controlla di averlo copiato bene, o che non sia già stato usato."

type AttemptKey = Parameters<typeof attemptsBlockedUntil>[0]

async function attemptKeyFor(): Promise<AttemptKey | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return null
  return { kind: "LOGIN", email: attemptEmail(user.email), ip: await clientIp() }
}

export type SecondFactorResult = ActionResult<{ next: string }>

export async function verifySecondFactor(
  values: z.infer<typeof totpSchema>,
): Promise<SecondFactorResult> {
  await requireAdminFirstFactor()
  const parsed = totpSchema.safeParse(values)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Codice non valido" }
  }

  const key = await attemptKeyFor()
  if (!key) return { ok: false, error: GENERIC_ERROR_MESSAGE }
  if (await attemptsBlockedUntil(key)) return { ok: false, error: TOO_MANY_ATTEMPTS_MESSAGE }

  const supabase = await createClient()
  const factor = await verifiedTotpFactor(supabase)
  if (!factor) return { ok: true, data: { next: MFA_ENROLL_PATH } }

  const outcome = await verifyTotpCode(supabase, factor.id, parsed.data.code)
  if (outcome === "wrong-code") {
    await recordLoginAttempt(key, false)
    return { ok: false, error: WRONG_CODE }
  }
  if (outcome === "error") return { ok: false, error: GENERIC_ERROR_MESSAGE }

  await recordLoginAttempt(key, true)
  return { ok: true, data: { next: getDashboardPath("ADMIN") } }
}

export async function redeemRecoveryCode(
  values: z.infer<typeof recoverySchema>,
): Promise<SecondFactorResult> {
  const { userId } = await requireAdminFirstFactor()
  const parsed = recoverySchema.safeParse(values)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Codice non valido" }
  }

  const key = await attemptKeyFor()
  if (!key) return { ok: false, error: GENERIC_ERROR_MESSAGE }
  if (await attemptsBlockedUntil(key)) return { ok: false, error: TOO_MANY_ATTEMPTS_MESSAGE }

  // Il lasciapassare è legato alla sessione: senza il suo id (non dovrebbe
  // mai mancare in un JWT di Supabase) non si può emettere
  const level = await getSessionLevel()
  if (!level.sessionId) return { ok: false, error: GENERIC_ERROR_MESSAGE }

  const result = await consumeRecoveryCode(userId, parsed.data.code)
  if (!result.ok) {
    await recordLoginAttempt(key, false)
    return { ok: false, error: WRONG_RECOVERY_CODE }
  }

  await recordLoginAttempt(key, true)
  await issueRecoveryPass(userId, level.sessionId, result.remaining)
  // La pagina, ricaricata, mostra «Ti restano n codici» e il tasto Continua
  return { ok: true, data: { next: MFA_VERIFY_PATH } }
}

// «Continua» dopo l'avviso dei codici rimasti
export async function continueAfterRecoveryNotice(): Promise<void> {
  await requireAdminFirstFactor()
  await clearRecoveryNotice()
  redirect(getDashboardPath("ADMIN"))
}
