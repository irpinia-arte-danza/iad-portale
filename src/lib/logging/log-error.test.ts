import { describe, expect, it, vi } from "vitest"

import { describeError, logError } from "./log-error"

describe("describeError", () => {
  it("di un errore Prisma tiene codice e campi, non il messaggio con la query", () => {
    const prismaLike = Object.assign(
      new Error('Unique constraint failed on the fields: (`fiscal_code`) — RSSMRA80A01F839X'),
      {
        name: "PrismaClientKnownRequestError",
        code: "P2002",
        meta: { target: ["fiscal_code"] },
      },
    )
    expect(describeError(prismaLike)).toEqual({
      name: "PrismaClientKnownRequestError",
      code: "P2002",
      target: ["fiscal_code"],
    })
  })

  it("di un errore qualunque tiene nome e messaggio", () => {
    expect(describeError(new TypeError("fetch failed"))).toEqual({
      name: "TypeError",
      message: "fetch failed",
    })
    const sys = Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" })
    expect(describeError(sys)).toEqual({
      name: "Error",
      code: "ECONNREFUSED",
      message: "connect ECONNREFUSED",
    })
  })

  it("di un valore che non è un errore tiene il tipo e una stringa corta", () => {
    expect(describeError("boom")).toEqual({ name: "string", message: "boom" })
    expect(describeError(undefined)).toEqual({ name: "undefined", message: "undefined" })
  })
})

describe("logError", () => {
  it("passa a console.error il contesto, gli extra e il riassunto, mai l'oggetto", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    const error = Object.assign(new Error("secret query"), {
      code: "P2025",
      meta: { target: "athletes" },
    })
    logError("[x action] error", error, { athleteId: "abc" })
    expect(spy).toHaveBeenCalledWith("[x action] error", {
      athleteId: "abc",
      error: { name: "Error", code: "P2025", target: ["athletes"] },
    })
    expect(JSON.stringify(spy.mock.calls)).not.toContain("secret query")
    spy.mockRestore()
  })
})
