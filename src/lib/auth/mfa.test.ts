import { beforeEach, describe, expect, it, vi } from "vitest"

// ─────────────────────────────────────────────────────────────────────────
// Supabase Auth finto: fattori per utente, enroll/verify, API admin. Serve a
// provare la logica attorno alle chiamate (fattori a metà tolti, codice
// sbagliato distinto da errore tecnico, azzeramento → zero fattori e zero
// codici). Supabase vero non c'è in locale.
// ─────────────────────────────────────────────────────────────────────────

type Factor = { id: string; status: "verified" | "unverified"; friendly_name?: string; factor_type: "totp" }
const factorsByUser = new Map<string, Factor[]>()
const codesByUser = new Map<string, number>()
let enrollCounter = 0

vi.mock("@/lib/prisma", () => ({
  prisma: {
    mfaRecoveryCode: {
      deleteMany: async ({ where }: { where: { userId: string } }) => {
        const n = codesByUser.get(where.userId) ?? 0
        codesByUser.delete(where.userId)
        return { count: n }
      },
    },
  },
}))

vi.mock("@/lib/supabase/admin-client", () => ({
  createAdminClient: () => ({
    auth: {
      admin: {
        mfa: {
          listFactors: async ({ userId }: { userId: string }) => ({
            data: { factors: factorsByUser.get(userId) ?? [] },
            error: null,
          }),
          deleteFactor: async ({ id, userId }: { id: string; userId: string }) => {
            const list = factorsByUser.get(userId) ?? []
            factorsByUser.set(
              userId,
              list.filter((f) => f.id !== id),
            )
            return { data: { id }, error: null }
          },
        },
      },
    },
  }),
}))

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => fakeUserClient("u1") }))
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined, set: () => undefined }) }))

function fakeUserClient(userId: string, opts: { acceptCode?: string; sessionToken?: string } = {}) {
  const list = () => factorsByUser.get(userId) ?? []
  return {
    auth: {
      getSession: async () => ({
        data: { session: opts.sessionToken ? { access_token: opts.sessionToken } : null },
      }),
      mfa: {
        listFactors: async () => ({
          data: { all: list(), totp: list().filter((f) => f.factor_type === "totp") },
          error: null,
        }),
        unenroll: async ({ factorId }: { factorId: string }) => {
          factorsByUser.set(userId, list().filter((f) => f.id !== factorId))
          return { data: { id: factorId }, error: null }
        },
        enroll: async ({ friendlyName }: { friendlyName: string }) => {
          const id = `f${++enrollCounter}`
          factorsByUser.set(userId, [...list(), { id, status: "unverified", friendly_name: friendlyName, factor_type: "totp" }])
          return {
            data: { id, totp: { qr_code: "data:image/svg+xml;utf-8,<svg/>", secret: "JBSWY3DPEHPK3PXP", uri: "otpauth://" } },
            error: null,
          }
        },
        challengeAndVerify: async ({ factorId, code }: { factorId: string; code: string }) => {
          if (code !== (opts.acceptCode ?? "123456")) {
            return { data: null, error: { code: "mfa_verification_failed", message: "Invalid TOTP code entered" } }
          }
          factorsByUser.set(userId, list().map((f) => (f.id === factorId ? { ...f, status: "verified" } : f)))
          return { data: {}, error: null }
        },
      },
    },
  }
}

function jwt(payload: Record<string, unknown>): string {
  const b64 = (s: string) => Buffer.from(s).toString("base64url")
  return `${b64('{"alg":"HS256"}')}.${b64(JSON.stringify(payload))}.sig`
}

const {
  adminHasVerifiedFactor,
  adminResetSecondFactor,
  beginTotpEnrollment,
  decodeJwtPayload,
  sessionLevelOf,
  verifiedTotpFactor,
  verifyTotpCode,
} = await import("./mfa")

describe("livello della sessione dal JWT", () => {
  it("legge aal e session_id dal payload, senza verificarne la firma (lo ha già fatto getUser)", async () => {
    const token = jwt({ aal: "aal2", session_id: "s-1", sub: "u1" })
    expect(decodeJwtPayload(token)).toMatchObject({ aal: "aal2", session_id: "s-1" })
    const client = fakeUserClient("u1", { sessionToken: token }) as never
    expect(await sessionLevelOf(client)).toEqual({ aal: "aal2", sessionId: "s-1" })
  })

  it("senza sessione, o con token rotto, è aal1", async () => {
    expect(await sessionLevelOf(fakeUserClient("u1") as never)).toEqual({ aal: "aal1", sessionId: null })
    expect(await sessionLevelOf(fakeUserClient("u1", { sessionToken: "x.y" }) as never)).toEqual({
      aal: "aal1",
      sessionId: null,
    })
    expect(decodeJwtPayload("solo-una-parte")).toBeNull()
  })
})

describe("iscrizione e verifica", () => {
  beforeEach(() => {
    factorsByUser.clear()
    codesByUser.clear()
  })

  it("iniziare l'iscrizione toglie i fattori rimasti a metà e ne crea uno nuovo", async () => {
    factorsByUser.set("u1", [
      { id: "stale", status: "unverified", factor_type: "totp" },
      { id: "ok", status: "verified", factor_type: "totp" },
    ])
    const client = fakeUserClient("u1") as never
    const start = await beginTotpEnrollment(client, "IAD Portale")
    expect(start?.qrCode.startsWith("data:image/svg+xml")).toBe(true)
    expect(start?.secret).toBe("JBSWY3DPEHPK3PXP")
    const ids = (factorsByUser.get("u1") ?? []).map((f) => f.id)
    expect(ids).not.toContain("stale")
    expect(ids).toContain("ok")
    expect(ids).toContain(start?.factorId)
  })

  it("il fattore verificato è quello che conta; un codice sbagliato è «wrong-code», non un errore", async () => {
    const client = fakeUserClient("u1") as never
    expect(await verifiedTotpFactor(client)).toBeNull()
    const start = await beginTotpEnrollment(client, "IAD Portale")
    expect(await verifiedTotpFactor(client)).toBeNull()
    expect(await verifyTotpCode(client, start!.factorId, "000000")).toBe("wrong-code")
    expect(await verifiedTotpFactor(client)).toBeNull()
    expect(await verifyTotpCode(client, start!.factorId, "123456")).toBe("ok")
    expect(await verifiedTotpFactor(client)).toMatchObject({ id: start!.factorId })
  })
})

describe("azzeramento da parte dell'altro admin", () => {
  beforeEach(() => {
    factorsByUser.clear()
    codesByUser.clear()
  })

  it("dopo, l'admin ha zero fattori e zero codici", async () => {
    factorsByUser.set("u2", [
      { id: "a", status: "verified", factor_type: "totp" },
      { id: "b", status: "unverified", factor_type: "totp" },
    ])
    codesByUser.set("u2", 6)
    expect(await adminHasVerifiedFactor("u2")).toBe(true)

    expect(await adminResetSecondFactor("u2")).toEqual({ factorsRemoved: 2, codesRemoved: 6 })

    expect(factorsByUser.get("u2")).toEqual([])
    expect(codesByUser.has("u2")).toBe(false)
    expect(await adminHasVerifiedFactor("u2")).toBe(false)
  })

  it("non tocca gli altri utenti", async () => {
    factorsByUser.set("u1", [{ id: "mine", status: "verified", factor_type: "totp" }])
    factorsByUser.set("u2", [{ id: "theirs", status: "verified", factor_type: "totp" }])
    await adminResetSecondFactor("u2")
    expect(factorsByUser.get("u1")).toHaveLength(1)
  })
})
