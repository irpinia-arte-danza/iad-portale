"use server"

import { z } from "zod"

import { logAudit } from "@/lib/audit/log-audit"
import { requireAdminFirstFactor } from "@/lib/auth/require-admin"
import {
  adminRemoveOtherFactors,
  beginTotpEnrollment,
  getSessionLevel,
  hasRecoveryPass,
  verifiedTotpFactor,
  verifyTotpCode,
  type EnrollmentStart,
} from "@/lib/auth/mfa"
import { adminGate } from "@/lib/auth/mfa-gate"
import { issueRecoveryCodes } from "@/lib/auth/recovery-codes"
import { GENERIC_ERROR_MESSAGE } from "@/lib/errors"
import type { ActionResult } from "@/lib/schemas/common"
import { createClient } from "@/lib/supabase/server"

// ─────────────────────────────────────────────────────────────────────────
// Iscrizione al secondo fattore. Solo admin (primo fattore superato).
//
// Chi ha già un fattore verificato può sostituirlo solo con una sessione
// aal2 o con il lasciapassare di un codice di recupero: altrimenti chiunque
// abbia la sola password potrebbe mettere il proprio telefono al posto
// dell'iPad di Giuseppina.
// ─────────────────────────────────────────────────────────────────────────

const codeSchema = z.object({
  factorId: z.string().min(1),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, { message: "Scrivi i sei numeri che compaiono nell'app" }),
})

async function canChangeFactor(userId: string): Promise<boolean> {
  const supabase = await createClient()
  if (!(await verifiedTotpFactor(supabase))) return true
  const level = await getSessionLevel()
  const recoveryPass = await hasRecoveryPass(userId, level.sessionId)
  return adminGate({ role: "ADMIN", aal: level.aal, recoveryPass }) === "ok"
}

export async function startSecondFactorEnrollment(): Promise<
  ActionResult<EnrollmentStart>
> {
  const { userId } = await requireAdminFirstFactor()
  if (!(await canChangeFactor(userId))) {
    return {
      ok: false,
      error:
        "Hai già un secondo fattore attivo: per sostituirlo entra con il codice dell'app o con un codice di recupero.",
    }
  }
  const supabase = await createClient()
  const start = await beginTotpEnrollment(supabase, "IAD Portale")
  if (!start) return { ok: false, error: GENERIC_ERROR_MESSAGE }
  return { ok: true, data: start }
}

export async function completeSecondFactorEnrollment(
  values: z.infer<typeof codeSchema>,
): Promise<ActionResult<{ recoveryCodes: string[] }>> {
  const { userId } = await requireAdminFirstFactor()
  const parsed = codeSchema.safeParse(values)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Codice non valido" }
  }
  if (!(await canChangeFactor(userId))) {
    return { ok: false, error: "Per sostituire il secondo fattore serve il codice di quello attuale." }
  }

  const supabase = await createClient()
  const outcome = await verifyTotpCode(supabase, parsed.data.factorId, parsed.data.code)
  if (outcome === "wrong-code") {
    return {
      ok: false,
      error: "Il codice non corrisponde. Aspetta che nell'app compaia il prossimo e riprova.",
    }
  }
  if (outcome === "error") return { ok: false, error: GENERIC_ERROR_MESSAGE }

  // Il fattore nuovo è verificato e la sessione è aal2: via quelli vecchi,
  // nuovi codici di recupero (i vecchi non devono aprire il fattore nuovo)
  const removed = await adminRemoveOtherFactors(userId, parsed.data.factorId)
  const recoveryCodes = await issueRecoveryCodes(userId)

  await logAudit({
    userId,
    action: "MFA_ENROLL",
    entityType: "User",
    entityId: userId,
    changes: { replacedFactors: removed, recoveryCodes: recoveryCodes.length },
  })

  return { ok: true, data: { recoveryCodes } }
}
