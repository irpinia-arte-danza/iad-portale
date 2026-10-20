import { NextRequest, NextResponse } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Il proxy con sessioni finte: chi è entrato da un link e non ha scelto la
// password va a /imposta-password da qualunque area; con il flag scritto da
// setOwnPassword le aree si aprono.

const now = Math.floor(Date.now() / 1000)

const state = {
  user: null as null | { id: string; app_metadata: Record<string, unknown> },
  claims: null as unknown,
  role: "PARENT" as string,
  aal: "aal1" as "aal1" | "aal2",
}

vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: async () => ({
    supabaseResponse: NextResponse.next(),
    user: state.user,
    level: { aal: state.aal, sessionId: "s1" },
    claims: state.claims,
  }),
}))
vi.mock("@/lib/auth/account-state", () => ({
  NO_ACCESS_ROUTE: "/auth/no-access",
  resolveAccountState: async (userId: string) => ({
    state: "ok",
    userId,
    role: state.role,
    parentId: null,
    teacherId: null,
    athleteId: null,
  }),
}))
vi.mock("@/lib/auth/mfa", () => ({ recoveryPassIsValid: () => false }))

const { proxy } = await import("./proxy")

async function go(path: string): Promise<string | null> {
  const response = await proxy(new NextRequest(`https://area.test${path}`))
  const location = response.headers.get("location")
  return location ? new URL(location).pathname : null
}

const AREAS: Array<[string, string]> = [
  ["/tessere", "CARD_MANAGER"],
  ["/parent/dashboard", "PARENT"],
  ["/teacher/dashboard", "TEACHER"],
  ["/admin/dashboard", "ADMIN"],
]

describe("proxy: password non ancora scelta", () => {
  beforeEach(() => {
    state.user = { id: "u1", app_metadata: { provider: "email" } }
    state.claims = { amr: [{ method: "invite", timestamp: now }], aal: "aal1" }
    state.aal = "aal1"
  })

  it.each(AREAS)("sessione da invito senza password_set su %s → /imposta-password", async (path, role) => {
    state.role = role
    expect(await go(path)).toBe("/imposta-password")
  })

  it("anche /admin, /login e /password-dimenticata (il ricaricamento dopo il doppio tap)", async () => {
    state.role = "ADMIN"
    expect(await go("/admin")).toBe("/imposta-password")
    expect(await go("/login")).toBe("/imposta-password")
    expect(await go("/password-dimenticata")).toBe("/imposta-password")
    expect(await go("/imposta-2fa")).toBe("/imposta-password")
  })

  it("la pagina della password e /auth/* restano raggiungibili", async () => {
    expect(await go("/imposta-password")).toBeNull()
    expect(await go("/auth/no-access")).toBeNull()
  })

  it.each(AREAS)("con password_set = true %s si apre", async (path, role) => {
    state.role = role
    state.user = { id: "u1", app_metadata: { provider: "email", password_set: true } }
    // L'admin passa anche dal secondo fattore: qui la sessione è aal2
    state.aal = "aal2"
    expect(await go(path)).toBeNull()
  })

  it("utenti di prima del flag, entrati con la password: nessun cambiamento", async () => {
    state.role = "PARENT"
    state.claims = { amr: [{ method: "password", timestamp: now }] }
    expect(await go("/parent/dashboard")).toBeNull()
  })

  it("anonimo: login come prima", async () => {
    state.user = null
    expect(await go("/parent/dashboard")).toBe("/login")
  })
})
