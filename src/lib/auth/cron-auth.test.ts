import { describe, expect, it } from "vitest"

import { authorizeCron } from "./cron-auth"

const SECRET = "s3gr3to-lungo-abbastanza"

describe("authorizeCron", () => {
  it("header giusto → ok", () => {
    expect(authorizeCron(`Bearer ${SECRET}`, SECRET)).toBe("ok")
  })

  it("segreto sbagliato della stessa lunghezza → unauthorized", () => {
    const wrong = SECRET.slice(0, -1) + "X"
    expect(wrong.length).toBe(SECRET.length)
    expect(authorizeCron(`Bearer ${wrong}`, SECRET)).toBe("unauthorized")
  })

  it("lunghezza diversa → unauthorized, anche se è un prefisso", () => {
    expect(authorizeCron(`Bearer ${SECRET.slice(0, -1)}`, SECRET)).toBe(
      "unauthorized",
    )
    expect(authorizeCron(`Bearer ${SECRET}x`, SECRET)).toBe("unauthorized")
  })

  it("header assente o senza Bearer → unauthorized", () => {
    expect(authorizeCron(null, SECRET)).toBe("unauthorized")
    expect(authorizeCron(undefined, SECRET)).toBe("unauthorized")
    expect(authorizeCron("", SECRET)).toBe("unauthorized")
    expect(authorizeCron(SECRET, SECRET)).toBe("unauthorized")
    expect(authorizeCron(`bearer ${SECRET}`, SECRET)).toBe("unauthorized")
  })

  it("segreto mancante → unconfigured, qualunque sia l'header", () => {
    expect(authorizeCron(`Bearer ${SECRET}`, undefined)).toBe("unconfigured")
    expect(authorizeCron(`Bearer ${SECRET}`, "")).toBe("unconfigured")
    expect(authorizeCron(null, undefined)).toBe("unconfigured")
  })

  it("l'header x-vercel-cron non è un'autorizzazione (non viene nemmeno guardato)", () => {
    // La funzione riceve solo l'header Authorization: qualunque altro
    // header non può contare. Senza Bearer → rifiuto.
    expect(authorizeCron(null, SECRET)).toBe("unauthorized")
  })
})
