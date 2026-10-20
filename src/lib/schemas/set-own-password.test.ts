import { describe, expect, it } from "vitest"

import { setOwnPasswordSchema } from "./admin-settings"

describe("setOwnPasswordSchema", () => {
  it("tiene la regola delle password uguali anche con il campo in più", () => {
    expect(
      setOwnPasswordSchema.safeParse({
        currentPassword: "",
        newPassword: "Danza2026!x",
        confirmPassword: "Danza2026!X",
      }).success,
    ).toBe(false)
    expect(
      setOwnPasswordSchema.safeParse({
        newPassword: "Danza2026!x",
        confirmPassword: "Danza2026!x",
      }).success,
    ).toBe(true)
  })

  it("la regola di Supabase vale anche qui: minuscola, maiuscola, numero, simbolo, 10 caratteri", () => {
    const parse = (p: string) =>
      setOwnPasswordSchema.safeParse({ newPassword: p, confirmPassword: p })
    expect(parse("ACAdon92.,.").success).toBe(true)
    expect(parse("abcdefghij").success).toBe(false)
    const short = parse("Ab1!")
    expect(short.success).toBe(false)
    if (!short.success) {
      expect(short.error.issues[0]?.message).toBe("La password deve avere almeno 10 caratteri.")
    }
  })

  it("la password attuale è facoltativa: decide il server se serve", () => {
    const parsed = setOwnPasswordSchema.safeParse({
      currentPassword: "vecchia-password",
      newPassword: "Danza2026!x",
      confirmPassword: "Danza2026!x",
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data.currentPassword).toBe("vecchia-password")
  })
})
