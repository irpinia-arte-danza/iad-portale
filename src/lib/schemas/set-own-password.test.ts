import { describe, expect, it } from "vitest"

import { setOwnPasswordSchema } from "./admin-settings"

describe("setOwnPasswordSchema", () => {
  it("tiene la regola delle password uguali anche con il campo in più", () => {
    expect(
      setOwnPasswordSchema.safeParse({
        currentPassword: "",
        newPassword: "abcdefghij",
        confirmPassword: "abcdefghiX",
      }).success,
    ).toBe(false)
    expect(
      setOwnPasswordSchema.safeParse({
        newPassword: "abcdefghij",
        confirmPassword: "abcdefghij",
      }).success,
    ).toBe(true)
  })

  it("la password attuale è facoltativa: decide il server se serve", () => {
    const parsed = setOwnPasswordSchema.safeParse({
      currentPassword: "vecchia-password",
      newPassword: "abcdefghij",
      confirmPassword: "abcdefghij",
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data.currentPassword).toBe("vecchia-password")
  })
})
