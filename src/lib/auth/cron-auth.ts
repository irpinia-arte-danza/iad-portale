import { timingSafeEqual } from "node:crypto"

// ─────────────────────────────────────────────────────────────────────────
// Chi può chiamare un cron (/api/cron/*).
//
// Una cosa sola: `Authorization: Bearer <CRON_SECRET>`. Vercel lo manda da
// solo alle route registrate in vercel.json quando la variabile CRON_SECRET
// esiste; per una chiamata a mano lo si scrive nell'header. Niente altro:
// né l'header `x-vercel-cron`, che chiunque può scrivere in una richiesta,
// né scorciatoie in sviluppo.
//
// Il confronto è a tempo costante: con `===` il tempo di risposta cambia a
// seconda di quanti caratteri iniziali coincidono, e un segreto si può
// indovinare un carattere alla volta. Lunghezze diverse → rifiuto senza
// confrontare (timingSafeEqual lo pretende, e la lunghezza del segreto non
// è un'informazione che si regala).
// ─────────────────────────────────────────────────────────────────────────

export type CronAuthResult =
  // Header giusto
  | "ok"
  // Header assente, malformato o con un segreto diverso
  | "unauthorized"
  // CRON_SECRET non impostato: la route non deve fare niente
  | "unconfigured"

const BEARER_PREFIX = "Bearer "

export function authorizeCron(
  authorizationHeader: string | null | undefined,
  secret: string | undefined,
): CronAuthResult {
  if (!secret) return "unconfigured"
  if (!authorizationHeader?.startsWith(BEARER_PREFIX)) return "unauthorized"

  const presented = Buffer.from(
    authorizationHeader.slice(BEARER_PREFIX.length),
    "utf8",
  )
  const expected = Buffer.from(secret, "utf8")
  if (presented.length !== expected.length) return "unauthorized"

  return timingSafeEqual(presented, expected) ? "ok" : "unauthorized"
}
