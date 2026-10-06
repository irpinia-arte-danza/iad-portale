import { describe, expect, it } from "vitest"

import { INVALID_CREDENTIALS_MESSAGE, loginErrorMessage } from "./login-error"

describe("loginErrorMessage", () => {
  it("credenziali errate e email mai attivata: stesso messaggio", () => {
    expect(loginErrorMessage("Invalid login credentials")).toBe(
      INVALID_CREDENTIALS_MESSAGE,
    )
    expect(loginErrorMessage("Email not confirmed")).toBe(
      INVALID_CREDENTIALS_MESSAGE,
    )
  })

  it("troppi tentativi e errori sconosciuti hanno il loro testo", () => {
    expect(loginErrorMessage("Too many requests")).toContain("Troppi tentativi")
    expect(loginErrorMessage("boom")).toBe("Errore durante l'accesso, riprova")
  })
})
