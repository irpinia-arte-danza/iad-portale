import { beforeEach, describe, expect, it, vi } from "vitest"

// requireAdmin con sessioni finte: aal1 → al secondo passaggio, aal2 → ok,
// lasciapassare del codice di recupero → ok. Gli altri ruoli non passano
// di qui (hanno i loro requireParent/requireTeacher) e per loro adminGate
// risponde sempre «ok»: è coperto in mfa-gate.test.ts.

class RedirectError extends Error {
  constructor(public readonly to: string) {
    super(`redirect ${to}`)
  }
}

const state = {
  account: { state: "ok", role: "ADMIN", userId: "u-admin" } as Record<string, unknown>,
  level: { aal: "aal1", sessionId: "s1" },
  pass: false,
}

vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new RedirectError(to)
  },
}))
vi.mock("./current-account", () => ({ getCurrentAccount: async () => state.account }))
vi.mock("./mfa", () => ({
  getSessionLevel: async () => state.level,
  hasRecoveryPass: async () => state.pass,
}))

const { requireAdmin, requireAdminFirstFactor } = await import("./require-admin")

async function redirectOf(fn: () => Promise<unknown>): Promise<string | null> {
  try {
    await fn()
    return null
  } catch (error) {
    if (error instanceof RedirectError) return error.to
    throw error
  }
}

describe("requireAdmin", () => {
  beforeEach(() => {
    state.account = { state: "ok", role: "ADMIN", userId: "u-admin" }
    state.level = { aal: "aal1", sessionId: "s1" }
    state.pass = false
  })

  it("aal1 → rifiuto: va al secondo passaggio", async () => {
    expect(await redirectOf(requireAdmin)).toBe("/verifica-2fa")
  })

  it("aal2 → ok", async () => {
    state.level = { aal: "aal2", sessionId: "s1" }
    expect(await requireAdmin()).toEqual({ userId: "u-admin" })
  })

  it("aal1 con il lasciapassare di un codice di recupero → ok", async () => {
    state.pass = true
    expect(await requireAdmin()).toEqual({ userId: "u-admin" })
  })

  it("il primo fattore basta per le pagine del secondo passaggio", async () => {
    expect(await requireAdminFirstFactor()).toEqual({ userId: "u-admin" })
  })

  it("non admin: alla propria dashboard, anche con aal2", async () => {
    state.account = { state: "ok", role: "PARENT", userId: "u-parent" }
    state.level = { aal: "aal2", sessionId: "s1" }
    expect(await redirectOf(requireAdmin)).toBe("/parent/dashboard")
  })

  it("anonimo → login, bloccato → no-access", async () => {
    state.account = { state: "anonymous" }
    expect(await redirectOf(requireAdmin)).toBe("/login")
    state.account = { state: "blocked", reason: "inactive" }
    expect(await redirectOf(requireAdmin)).toBe("/auth/no-access")
  })
})
