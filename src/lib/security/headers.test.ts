import { describe, expect, it } from "vitest"

import {
  contentSecurityPolicy,
  PERMISSIONS_POLICY,
  securityHeaders,
} from "./headers"

const PROD = { supabaseOrigin: "https://abc.supabase.co", dev: false }

describe("securityHeaders", () => {
  it("i quattro header fissi, con i valori decisi", () => {
    const map = Object.fromEntries(
      securityHeaders(PROD).map((h) => [h.key, h.value]),
    )
    // SAMEORIGIN e non DENY: i nostri iframe (anteprima e PDF della
    // ricevuta) devono poter caricare le nostre route
    expect(map["X-Frame-Options"]).toBe("SAMEORIGIN")
    expect(map["X-Content-Type-Options"]).toBe("nosniff")
    expect(map["Referrer-Policy"]).toBe("strict-origin-when-cross-origin")
    expect(map["Permissions-Policy"]).toBe(PERMISSIONS_POLICY)
  })

  it("la fotocamera è l'unica API del browser concessa", () => {
    const allowed = PERMISSIONS_POLICY.split(", ").filter(
      (d) => !d.endsWith("=()"),
    )
    expect(allowed).toEqual(["camera=(self)"])
  })

  it("la CSP è solo in report: nessun Content-Security-Policy enforce", () => {
    const keys = securityHeaders(PROD).map((h) => h.key)
    expect(keys).toContain("Content-Security-Policy-Report-Only")
    expect(keys).not.toContain("Content-Security-Policy")
  })

  it("la CSP nomina Supabase per immagini e connessioni, e nient'altro di esterno", () => {
    const csp = contentSecurityPolicy(PROD)
    expect(csp).toContain("img-src 'self' data: blob: https://abc.supabase.co")
    expect(csp).toContain("connect-src 'self' https://abc.supabase.co")
    expect(csp).toContain("frame-src 'self'")
    expect(csp).toContain("frame-ancestors 'self'")
    expect(csp).not.toContain("frame-ancestors 'none'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("form-action 'self'")
    // Nessun'altra origine esterna
    const origins = csp.match(/https?:\/\/[^\s;]+/g) ?? []
    expect(new Set(origins)).toEqual(new Set(["https://abc.supabase.co"]))
  })

  it("in sviluppo aggiunge eval e websocket, in produzione no", () => {
    const dev = contentSecurityPolicy({ ...PROD, dev: true })
    expect(dev).toContain("'unsafe-eval'")
    expect(dev).toContain("ws:")
    const prod = contentSecurityPolicy(PROD)
    expect(prod).not.toContain("'unsafe-eval'")
    expect(prod).not.toContain("ws:")
  })

  it("senza origine Supabase configurata la policy resta valida", () => {
    const csp = contentSecurityPolicy({ supabaseOrigin: null, dev: false })
    expect(csp).toContain("img-src 'self' data: blob:;")
    expect(csp).toContain("connect-src 'self';")
  })
})
