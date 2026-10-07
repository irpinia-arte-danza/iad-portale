import { beforeEach, describe, expect, it, vi } from "vitest"

// Un database finto in memoria con la stessa forma delle chiamate Prisma
// usate dal modulo: basta per provare «valido una volta, non due» e «in
// tabella solo hash». La prova con Postgres vero è nel rehearsal locale.
type Row = { id: string; userId: string; codeHash: string; usedAt: Date | null }
const rows: Row[] = []
let nextId = 1

vi.mock("@/lib/prisma", () => {
  const mfaRecoveryCode = {
    deleteMany: async ({ where }: { where: { userId: string } }) => {
      const before = rows.length
      for (let i = rows.length - 1; i >= 0; i--) if (rows[i].userId === where.userId) rows.splice(i, 1)
      return { count: before - rows.length }
    },
    createMany: async ({ data }: { data: { userId: string; codeHash: string }[] }) => {
      for (const d of data) rows.push({ id: String(nextId++), usedAt: null, ...d })
      return { count: data.length }
    },
    count: async ({ where }: { where: { userId: string; usedAt: null } }) =>
      rows.filter((r) => r.userId === where.userId && r.usedAt === null).length,
    findMany: async ({ where }: { where: { userId: string; usedAt: null } }) =>
      rows.filter((r) => r.userId === where.userId && r.usedAt === null),
    updateMany: async ({
      where,
      data,
    }: {
      where: { id: string; usedAt: null }
      data: { usedAt: Date }
    }) => {
      const row = rows.find((r) => r.id === where.id && r.usedAt === null)
      if (!row) return { count: 0 }
      row.usedAt = data.usedAt
      return { count: 1 }
    },
  }
  const prisma = {
    mfaRecoveryCode,
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
  }
  return { prisma }
})

const {
  consumeRecoveryCode,
  countUnusedRecoveryCodes,
  deleteRecoveryCodes,
  issueRecoveryCodes,
} = await import("./recovery-codes")

const USER = "a0000000-0000-4000-8000-00000000ad01"

describe("codici di recupero", () => {
  beforeEach(() => {
    rows.length = 0
  })

  it("ne emette otto e in tabella finiscono solo hash bcrypt", async () => {
    const codes = await issueRecoveryCodes(USER)
    expect(codes).toHaveLength(8)
    expect(rows).toHaveLength(8)
    for (const row of rows) {
      expect(row.codeHash.startsWith("$2")).toBe(true)
      expect(codes).not.toContain(row.codeHash)
      for (const code of codes) expect(row.codeHash).not.toContain(code.replace("-", ""))
    }
    expect(await countUnusedRecoveryCodes(USER)).toBe(8)
  })

  it("un codice vale una volta sola", async () => {
    const [first] = await issueRecoveryCodes(USER)
    expect(await consumeRecoveryCode(USER, first)).toEqual({ ok: true, remaining: 7 })
    expect(await consumeRecoveryCode(USER, first)).toEqual({ ok: false })
    expect(await countUnusedRecoveryCodes(USER)).toBe(7)
  })

  it("accetta il codice scritto minuscolo, senza trattino, con 0 al posto di O", async () => {
    const [, second] = await issueRecoveryCodes(USER)
    const sloppy = second.toLowerCase().replace("-", " ").replace(/o/g, "0")
    expect(await consumeRecoveryCode(USER, sloppy)).toEqual({ ok: true, remaining: 7 })
  })

  it("rifiuta codici inventati, vuoti o di un altro utente", async () => {
    const [code] = await issueRecoveryCodes(USER)
    expect(await consumeRecoveryCode(USER, "ZZZZ-ZZZZ")).toEqual({ ok: false })
    expect(await consumeRecoveryCode(USER, "")).toEqual({ ok: false })
    expect(await consumeRecoveryCode("b0000000-0000-4000-8000-0000000000b1", code)).toEqual({ ok: false })
    expect(await countUnusedRecoveryCodes(USER)).toBe(8)
  })

  it("una nuova emissione sostituisce i codici vecchi, e l'azzeramento li toglie tutti", async () => {
    const [old] = await issueRecoveryCodes(USER)
    await issueRecoveryCodes(USER)
    expect(rows.filter((r) => r.userId === USER)).toHaveLength(8)
    expect(await consumeRecoveryCode(USER, old)).toEqual({ ok: false })
    expect(await deleteRecoveryCodes(USER)).toBe(8)
    expect(await countUnusedRecoveryCodes(USER)).toBe(0)
  })
})
