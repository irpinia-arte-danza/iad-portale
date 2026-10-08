import { describe, expect, it } from "vitest"

import nextConfig from "../../../next.config"

import { FRAME_OPTIONS } from "./headers"

// ─────────────────────────────────────────────────────────────────────────
// Gli header arrivano alle route dal config di Next, non dalle route: qui si
// controlla la regola vera (sorgente e valori), per le route che finiscono
// dentro un nostro iframe e per le pagine admin che le contengono.
// ─────────────────────────────────────────────────────────────────────────

const ID = "0b0e7f0e-6c2a-4c0e-9a57-3a2f1d1c9b11"

// Come Next traduce la sorgente "/(.*)": un solo gruppo, ancorato
function matches(source: string, path: string): boolean {
  return new RegExp(`^${source}$`).test(path)
}

async function headersFor(path: string): Promise<Record<string, string>> {
  const rules = (await nextConfig.headers?.()) ?? []
  const out: Record<string, string> = {}
  for (const rule of rules) {
    if (!matches(rule.source, path)) continue
    for (const h of rule.headers) out[h.key] = h.value
  }
  return out
}

describe("header sulle route", () => {
  it.each([
    `/ricevute/anteprima/${ID}`,
    `/ricevute/${ID}`,
    "/admin/payments",
    "/admin/receipts",
    "/admin/dashboard",
    "/parent/dashboard",
    "/login",
  ])("%s → X-Frame-Options: SAMEORIGIN e frame-ancestors 'self'", async (path) => {
    const headers = await headersFor(path)
    expect(FRAME_OPTIONS).toBe("SAMEORIGIN")
    expect(headers["X-Frame-Options"]).toBe("SAMEORIGIN")
    expect(headers["Content-Security-Policy-Report-Only"]).toContain("frame-ancestors 'self'")
  })

  it("nessuna regola rimette DENY o 'none' su qualche percorso", async () => {
    const rules = (await nextConfig.headers?.()) ?? []
    const values = rules.flatMap((r) => r.headers.map((h) => h.value))
    expect(values).not.toContain("DENY")
    expect(values.some((v) => v.includes("frame-ancestors 'none'"))).toBe(false)
  })
})

describe("redirect", () => {
  it("/admin porta alla dashboard, e non è permanente", async () => {
    const rules = (await nextConfig.redirects?.()) ?? []
    expect(rules).toContainEqual({
      source: "/admin",
      destination: "/admin/dashboard",
      permanent: false,
    })
  })
})
