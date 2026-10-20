import { describe, expect, it } from "vitest"

import { needsPassword, passwordGateExempt, SET_PASSWORD_PATH } from "./password-gate"

const now = Math.floor(Date.now() / 1000)
const fromInvite = { amr: [{ method: "invite", timestamp: now }] }
const fromRecovery = { amr: [{ method: "recovery", timestamp: now }] }
const fromPassword = { amr: [{ method: "password", timestamp: now }] }
const fromPasswordAndTotp = {
  amr: [
    { method: "totp", timestamp: now },
    { method: "password", timestamp: now - 10 },
  ],
}

describe("needsPassword", () => {
  it("sessione da invito, password mai scelta → a /imposta-password", () => {
    expect(needsPassword({ app_metadata: {} }, fromInvite)).toBe(true)
    expect(needsPassword({ app_metadata: { provider: "email" } }, fromRecovery)).toBe(true)
  })

  it("password scelta da /imposta-password (flag in app_metadata) → passa", () => {
    expect(needsPassword({ app_metadata: { password_set: true } }, fromInvite)).toBe(false)
  })

  it("il flag vale solo se è proprio true", () => {
    expect(needsPassword({ app_metadata: { password_set: "true" } }, fromInvite)).toBe(true)
    expect(needsPassword({ app_metadata: { password_set: 1 } }, fromInvite)).toBe(true)
  })

  it("user_metadata non conta: lo scrive l'utente da solo", () => {
    expect(
      needsPassword({ app_metadata: {}, user_metadata: { password_set: true } } as never, fromInvite),
    ).toBe(true)
  })

  it("utenti di prima del flag entrati con la password → passano", () => {
    expect(needsPassword({ app_metadata: {} }, fromPassword)).toBe(false)
    expect(needsPassword({ app_metadata: {} }, fromPasswordAndTotp)).toBe(false)
  })

  it("JWT illeggibile e niente flag → si chiede la password", () => {
    expect(needsPassword({ app_metadata: {} }, null)).toBe(true)
    expect(needsPassword({}, { amr: "password" })).toBe(true)
  })

  it("senza utente non decide (l'anonimo va al login per altre vie)", () => {
    expect(needsPassword(null, fromInvite)).toBe(false)
  })
})

describe("passwordGateExempt", () => {
  it("la pagina della password, /auth/*, privacy e accesso non attivo restano aperte", () => {
    expect(passwordGateExempt(SET_PASSWORD_PATH)).toBe(true)
    expect(passwordGateExempt("/auth/confirm")).toBe(true)
    expect(passwordGateExempt("/auth/no-access")).toBe(true)
    expect(passwordGateExempt("/privacy")).toBe(true)
    expect(passwordGateExempt("/accesso-non-attivo")).toBe(true)
  })

  it("aree, secondo fattore, login e password dimenticata no", () => {
    for (const path of [
      "/tessere",
      "/parent/dashboard",
      "/teacher/dashboard",
      "/admin",
      "/admin/dashboard",
      "/imposta-2fa",
      "/verifica-2fa",
      "/login",
      "/password-dimenticata",
      "/",
    ]) {
      expect(passwordGateExempt(path), path).toBe(false)
    }
  })
})
