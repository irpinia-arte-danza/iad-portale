import "server-only"

import { prisma } from "@/lib/prisma"

// ─────────────────────────────────────────────────────────────────────────
// Quota giornaliera del piano Free di Resend: 100 email al giorno (3.000 al
// mese). Il conteggio si ricava da EmailLog, che registra ogni invio fatto
// dal gestionale.
//
// Due limiti da conoscere, per non spacciare questa stima per una certezza:
// - conta solo ciò che è partito da qui: un invio fatto altrove con la stessa
//   chiave API non compare;
// - la giornata qui è quella di Roma, mentre il contatore di Resend si azzera
//   sul suo fuso. A cavallo della mezzanotte i due numeri possono divergere.
// Serve ad avvisare prima di partire, non a sostituire la risposta del
// provider: l'invio si ferma comunque su daily_quota_exceeded.
// ─────────────────────────────────────────────────────────────────────────

export const RESEND_DAILY_LIMIT = 100

export type DailyQuota = {
  sentToday: number
  limit: number
  remaining: number
}

export async function getDailyEmailQuota(): Promise<DailyQuota> {
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT count(*)::bigint AS count
    FROM email_logs
    WHERE status <> 'FAILED'
      AND sent_at >= (
        date_trunc('day', now() AT TIME ZONE 'Europe/Rome') AT TIME ZONE 'Europe/Rome'
      )
  `
  const sentToday = Number(rows[0]?.count ?? 0)
  return {
    sentToday,
    limit: RESEND_DAILY_LIMIT,
    remaining: Math.max(0, RESEND_DAILY_LIMIT - sentToday),
  }
}
