import { describe, expect, it } from "vitest"

import { adminGate, sessionLevelFromClaims } from "./mfa-gate"

describe("adminGate", () => {
  it("admin con aal1 → secondo passaggio; con aal2 → ok", () => {
    expect(adminGate({ role: "ADMIN", aal: "aal1", recoveryPass: false })).toBe("second-factor")
    expect(adminGate({ role: "ADMIN", aal: "aal2", recoveryPass: false })).toBe("ok")
  })

  it("admin con aal1 ma con il lasciapassare del codice di recupero → ok", () => {
    expect(adminGate({ role: "ADMIN", aal: "aal1", recoveryPass: true })).toBe("ok")
  })

  it("genitore, insegnante e allieva con aal1 → ok come oggi", () => {
    for (const role of ["PARENT", "TEACHER", "ATHLETE"] as const) {
      expect(adminGate({ role, aal: "aal1", recoveryPass: false })).toBe("ok")
    }
  })
})

describe("sessionLevelFromClaims", () => {
  it("legge aal e session_id dal JWT", () => {
    expect(sessionLevelFromClaims({ aal: "aal2", session_id: "s1" })).toEqual({
      aal: "aal2",
      sessionId: "s1",
    })
  })

  it("tutto ciò che non è aal2 è aal1, anche se manca o è strano", () => {
    expect(sessionLevelFromClaims({ aal: "aal1", session_id: "s" })).toEqual({ aal: "aal1", sessionId: "s" })
    expect(sessionLevelFromClaims({})).toEqual({ aal: "aal1", sessionId: null })
    expect(sessionLevelFromClaims(null)).toEqual({ aal: "aal1", sessionId: null })
    expect(sessionLevelFromClaims({ aal: "aal3", session_id: 7 })).toEqual({ aal: "aal1", sessionId: null })
  })
})
