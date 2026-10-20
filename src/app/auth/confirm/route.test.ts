import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Due tap su «Attiva il mio accesso»: due POST con lo stesso token. Il
// primo lo consuma e apre la sessione; il secondo arriva con i cookie del
// primo e deve proseguire verso /imposta-password, non dire «link non
// valido». Supabase finto: il token si consuma una volta sola, la sessione
// sta nel «browser» (il cookie jar condiviso fra le due richieste).

const now = Math.floor(Date.now() / 1000)

function jwt(payload: Record<string, unknown>): string {
  const part = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url")
  return `${part({ alg: "none" })}.${part(payload)}.firma`
}

const auth = {
  validTokens: new Set<string>(),
  browserSession: null as null | { userId: string; amr: Array<{ method: string; timestamp: number }> },
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      verifyOtp: async ({ token_hash, type }: { token_hash: string; type: string }) => {
        if (!auth.validTokens.delete(token_hash)) {
          return { data: { session: null, user: null }, error: { code: "otp_expired" } }
        }
        auth.browserSession = { userId: "u-ref", amr: [{ method: type, timestamp: now }] }
        return { data: { session: {}, user: { id: "u-ref" } }, error: null }
      },
      getUser: async () => ({
        data: { user: auth.browserSession ? { id: auth.browserSession.userId } : null },
      }),
      getSession: async () => ({
        data: {
          session: auth.browserSession
            ? { access_token: jwt({ sub: auth.browserSession.userId, amr: auth.browserSession.amr }) }
            : null,
        },
      }),
      signOut: async () => {
        auth.browserSession = null
        return { error: null }
      },
    },
  }),
}))
vi.mock("@/lib/auth/account-state", () => ({
  NO_ACCESS_PAGE: "/accesso-non-attivo",
  resolveAccountState: async (userId: string) => ({
    state: "ok",
    userId,
    role: "CARD_MANAGER",
    parentId: null,
    teacherId: null,
    athleteId: null,
  }),
}))
vi.mock("@/lib/prisma", () => ({ prisma: {} }))

const { POST } = await import("./route")

function confirm(tokenHash: string, type = "invite") {
  const body = new URLSearchParams({ token_hash: tokenHash, type })
  return POST(
    new NextRequest("https://area.test/auth/confirm", {
      method: "POST",
      body,
      headers: { "content-type": "application/x-www-form-urlencoded" },
    }),
  )
}

function target(response: Response): string {
  const url = new URL(response.headers.get("location") ?? "")
  return `${url.pathname}${url.search}`
}

describe("POST /auth/confirm, doppio tap", () => {
  beforeEach(() => {
    auth.validTokens = new Set(["tok-1"])
    auth.browserSession = null
  })

  it("due POST consecutivi con lo stesso token: entrambi a /imposta-password", async () => {
    const first = await confirm("tok-1")
    expect(first.status).toBe(303)
    expect(target(first)).toBe("/imposta-password?tipo=benvenuto")

    const second = await confirm("tok-1")
    expect(second.status).toBe(303)
    expect(target(second)).toBe("/imposta-password?tipo=benvenuto")
  })

  it("link di recupero: il secondo tap va al recupero", async () => {
    await confirm("tok-1", "recovery")
    expect(target(await confirm("tok-1", "recovery"))).toBe("/imposta-password?tipo=recupero")
  })

  it("token consumato e nessuna sessione: «link non valido» come prima", async () => {
    auth.validTokens.clear()
    expect(target(await confirm("tok-1"))).toBe("/password-dimenticata?motivo=link-non-valido")
  })

  it("token consumato e sessione vecchia, entrata con la password: «link non valido»", async () => {
    auth.validTokens.clear()
    auth.browserSession = { userId: "u-ref", amr: [{ method: "password", timestamp: now - 3600 }] }
    expect(target(await confirm("tok-1"))).toBe("/password-dimenticata?motivo=link-non-valido")
  })

  it("sessione nata da un link più di 15 minuti fa: «link non valido»", async () => {
    auth.validTokens.clear()
    auth.browserSession = { userId: "u-ref", amr: [{ method: "invite", timestamp: now - 16 * 60 }] }
    expect(target(await confirm("tok-1"))).toBe("/password-dimenticata?motivo=link-non-valido")
  })
})
