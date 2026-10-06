import "server-only"

import { headers } from "next/headers"

import { type LoginAttemptKind } from "@prisma/client"

import { prisma } from "@/lib/prisma"

import { normalizeEmail } from "./access-status-types"

// ─────────────────────────────────────────────────────────────────────────
// Tentativi di accesso: il limite lo mette il portale, non solo Supabase.
//
// Dopo MAX_FAILURES tentativi falliti in WINDOW_MINUTES (contati per email
// e per IP) si rifiuta per BLOCK_MINUTES con un messaggio neutro. Per
// «Password dimenticata» si conta per IP ogni richiesta, anche con email
// inesistente: altrimenti è un modo gratis per far lavorare il database.
//
// La parte che decide è pura (blockedUntil) e testata; quella che legge e
// scrive è qui sotto. Il cron notturno cancella le righe più vecchie di 24
// ore: è un contatore, non uno storico.
// ─────────────────────────────────────────────────────────────────────────

export const LOGIN_MAX_FAILURES = 5
export const LOGIN_WINDOW_MINUTES = 10
export const LOGIN_BLOCK_MINUTES = 15
export const LOGIN_ATTEMPTS_RETENTION_HOURS = 24

export const TOO_MANY_ATTEMPTS_MESSAGE = "Troppi tentativi, riprova fra 15 minuti"

/**
 * Fino a quando è bloccato chi ha questi tentativi falliti alle spalle, o
 * null. Blocco = MAX_FAILURES fallimenti dentro WINDOW_MINUTES; dura
 * BLOCK_MINUTES dall'ultimo del gruppo.
 */
export function blockedUntil(failureTimes: Date[], now: Date): Date | null {
  // Niente filtro «solo nel passato»: fra l'orologio del database e quello
  // di Node ci può essere qualche millisecondo, e un tentativo appena
  // registrato deve contare subito
  const times = failureTimes.map((t) => t.getTime()).sort((a, b) => a - b)
  const window = LOGIN_WINDOW_MINUTES * 60_000
  const block = LOGIN_BLOCK_MINUTES * 60_000
  let until: number | null = null
  for (let i = 0; i + LOGIN_MAX_FAILURES - 1 < times.length; i++) {
    const last = times[i + LOGIN_MAX_FAILURES - 1]
    if (last - times[i] <= window) {
      const candidate = last + block
      if (candidate > now.getTime() && (until === null || candidate > until)) {
        until = candidate
      }
    }
  }
  return until === null ? null : new Date(until)
}

// L'IP del client dietro Vercel: il primo di x-forwarded-for. Senza header
// (test, chiamate interne) si conta tutto sotto "unknown".
export async function clientIp(): Promise<string> {
  const h = await headers()
  const forwarded = h.get("x-forwarded-for")
  const first = forwarded?.split(",")[0]?.trim()
  return first || h.get("x-real-ip")?.trim() || "unknown"
}

type AttemptKey = { kind: LoginAttemptKind; email: string | null; ip: string }

// Fino a quando rifiutare, per email o per IP (vale il peggiore)
export async function attemptsBlockedUntil(
  key: AttemptKey,
  now: Date = new Date(),
): Promise<Date | null> {
  // Abbastanza indietro da coprire finestra + blocco
  const since = new Date(
    now.getTime() - (LOGIN_WINDOW_MINUTES + LOGIN_BLOCK_MINUTES) * 60_000,
  )
  const rows = await prisma.loginAttempt.findMany({
    where: {
      kind: key.kind,
      success: false,
      createdAt: { gte: since },
      OR: [
        { ip: key.ip },
        ...(key.email ? [{ email: key.email }] : []),
      ],
    },
    select: { email: true, ip: true, createdAt: true },
  })
  const byIp = blockedUntil(
    rows.filter((r) => r.ip === key.ip).map((r) => r.createdAt),
    now,
  )
  const byEmail = key.email
    ? blockedUntil(
        rows.filter((r) => r.email === key.email).map((r) => r.createdAt),
        now,
      )
    : null
  if (!byIp) return byEmail
  if (!byEmail) return byIp
  return byIp > byEmail ? byIp : byEmail
}

export async function recordLoginAttempt(
  key: AttemptKey,
  success: boolean,
): Promise<void> {
  await prisma.loginAttempt.create({
    data: { kind: key.kind, email: key.email, ip: key.ip, success },
  })
}

export function attemptEmail(raw: string): string | null {
  return normalizeEmail(raw)
}

// Il cron notturno: via le righe più vecchie di 24 ore
export async function purgeOldLoginAttempts(now: Date = new Date()): Promise<number> {
  const result = await prisma.loginAttempt.deleteMany({
    where: {
      createdAt: {
        lt: new Date(now.getTime() - LOGIN_ATTEMPTS_RETENTION_HOURS * 3_600_000),
      },
    },
  })
  return result.count
}
