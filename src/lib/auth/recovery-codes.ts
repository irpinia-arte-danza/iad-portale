import "server-only"

import bcrypt from "bcryptjs"

import { prisma } from "@/lib/prisma"

import {
  generateRecoveryCodes,
  normalizeRecoveryCode,
} from "./recovery-code-format"

// ─────────────────────────────────────────────────────────────────────────
// I codici di recupero nel database: solo hash bcrypt, mai in chiaro.
//
// Otto codici per admin, generati alla fine dell'iscrizione al secondo
// fattore e mostrati una volta. Chi li usa ne consuma uno (usedAt) e vede
// quanti gliene restano. L'azzeramento del secondo fattore li cancella
// tutti: i codici vecchi non devono aprire un fattore nuovo.
// ─────────────────────────────────────────────────────────────────────────

const BCRYPT_ROUNDS = 10

export async function issueRecoveryCodes(userId: string): Promise<string[]> {
  const codes = generateRecoveryCodes()
  const hashes = await Promise.all(codes.map((c) => bcrypt.hash(c, BCRYPT_ROUNDS)))
  await prisma.$transaction([
    prisma.mfaRecoveryCode.deleteMany({ where: { userId } }),
    prisma.mfaRecoveryCode.createMany({
      data: hashes.map((codeHash) => ({ userId, codeHash })),
    }),
  ])
  return codes
}

export async function countUnusedRecoveryCodes(userId: string): Promise<number> {
  return prisma.mfaRecoveryCode.count({ where: { userId, usedAt: null } })
}

export type ConsumeResult =
  | { ok: true; remaining: number }
  | { ok: false }

// Un codice vale una volta: si confronta con gli hash dei codici non ancora
// usati (al massimo otto bcrypt), e quello che corrisponde viene segnato.
// La riga si aggiorna solo se è ancora libera: due richieste insieme con lo
// stesso codice non passano entrambe.
export async function consumeRecoveryCode(
  userId: string,
  input: string,
): Promise<ConsumeResult> {
  const code = normalizeRecoveryCode(input)
  if (!code) return { ok: false }

  const candidates = await prisma.mfaRecoveryCode.findMany({
    where: { userId, usedAt: null },
    select: { id: true, codeHash: true },
  })
  for (const candidate of candidates) {
    if (await bcrypt.compare(code, candidate.codeHash)) {
      const marked = await prisma.mfaRecoveryCode.updateMany({
        where: { id: candidate.id, usedAt: null },
        data: { usedAt: new Date() },
      })
      if (marked.count === 0) return { ok: false }
      return { ok: true, remaining: await countUnusedRecoveryCodes(userId) }
    }
  }
  return { ok: false }
}

export async function deleteRecoveryCodes(userId: string): Promise<number> {
  const result = await prisma.mfaRecoveryCode.deleteMany({ where: { userId } })
  return result.count
}
