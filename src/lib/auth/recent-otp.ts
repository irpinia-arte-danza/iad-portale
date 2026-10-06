// ─────────────────────────────────────────────────────────────────────────
// La sessione viene da un link personale appena aperto?
//
// Cambiare la password senza conoscere quella attuale va bene solo subito
// dopo un invito o un recupero: il JWT di Supabase lo dice nel claim `amr`
// (Authentication Methods Reference), un elenco di { method, timestamp }.
// Qui si guarda se c'è un metodo "da link" negli ultimi 15 minuti. In ogni
// altro caso /imposta-password chiede la password attuale.
// ─────────────────────────────────────────────────────────────────────────

export const RECENT_OTP_MINUTES = 15

// I metodi che Supabase scrive dopo verifyOtp con type invite / recovery
// (e i loro parenti, nel caso cambi nome fra una versione e l'altra)
export const OTP_METHODS = ["invite", "recovery", "otp", "magiclink"] as const

type AmrEntry = { method?: unknown; timestamp?: unknown }

export function isRecentOtpSession(
  claims: unknown,
  now: number = Date.now(),
): boolean {
  if (!claims || typeof claims !== "object") return false
  const amr = (claims as { amr?: unknown }).amr
  if (!Array.isArray(amr)) return false
  const cutoff = now / 1000 - RECENT_OTP_MINUTES * 60
  return amr.some((entry: AmrEntry) => {
    if (!entry || typeof entry !== "object") return false
    const method = typeof entry.method === "string" ? entry.method : null
    const timestamp =
      typeof entry.timestamp === "number" ? entry.timestamp : null
    return (
      method !== null &&
      (OTP_METHODS as readonly string[]).includes(method) &&
      timestamp !== null &&
      timestamp >= cutoff &&
      timestamp <= now / 1000 + 60
    )
  })
}
