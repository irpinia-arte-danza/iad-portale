import { UserRole } from "@prisma/client"
import { describe, expect, it } from "vitest"

import { getDashboardPath, getRoleAreaPrefix } from "./dashboard-path"

// Ogni ruolo deve avere una destinazione: un ruolo senza dashboard manda
// l'utente in un vicolo cieco dopo il login. Il `never` nello switch lo
// impedisce a compilazione, questi test lo impediscono anche a runtime.
const TUTTI_I_RUOLI: UserRole[] = [
  UserRole.ADMIN,
  UserRole.PARENT,
  UserRole.TEACHER,
  UserRole.ATHLETE,
]

describe("getDashboardPath", () => {
  it("ogni ruolo ha una dashboard dentro la propria area", () => {
    for (const role of TUTTI_I_RUOLI) {
      const path = getDashboardPath(role)
      expect(path.startsWith("/")).toBe(true)
      expect(path.startsWith(getRoleAreaPrefix(role))).toBe(true)
    }
  })

  // L'allieva che accede per sé vede la stessa area del genitore: stessi
  // contenuti, per una persona sola. L'indirizzo resta /parent apposta.
  it("l'allieva condivide l'area del genitore", () => {
    expect(getDashboardPath(UserRole.ATHLETE)).toBe(
      getDashboardPath(UserRole.PARENT),
    )
    expect(getRoleAreaPrefix(UserRole.ATHLETE)).toBe(
      getRoleAreaPrefix(UserRole.PARENT),
    )
  })

  it("admin e insegnante restano nelle loro aree", () => {
    expect(getDashboardPath(UserRole.ADMIN)).toBe("/admin/dashboard")
    expect(getDashboardPath(UserRole.TEACHER)).toBe("/teacher/dashboard")
    expect(getRoleAreaPrefix(UserRole.ADMIN)).toBe("/admin")
    expect(getRoleAreaPrefix(UserRole.TEACHER)).toBe("/teacher")
  })
})
