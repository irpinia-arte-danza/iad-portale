import { describe, expect, it } from "vitest"

import { isPublicPath } from "./public-paths"

describe("isPublicPath", () => {
  it("l'informativa privacy si apre senza accesso, come il login", () => {
    expect(isPublicPath("/privacy")).toBe(true)
    expect(isPublicPath("/login")).toBe(true)
    expect(isPublicPath("/password-dimenticata")).toBe(true)
    expect(isPublicPath("/auth/confirm")).toBe(true)
  })

  it("le aree riservate restano dietro il login", () => {
    expect(isPublicPath("/parent/dashboard")).toBe(false)
    expect(isPublicPath("/teacher/dashboard")).toBe(false)
    expect(isPublicPath("/admin/dashboard")).toBe(false)
    expect(isPublicPath("/ricevute/abc")).toBe(false)
    // Un prefisso non basta: /privacy-x non è /privacy
    expect(isPublicPath("/privacy-x")).toBe(false)
  })
})
