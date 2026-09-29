import { describe, expect, it } from "vitest"

import { athleteCreateSchema } from "./athlete"
import { parentCreateSchema } from "./parent"

// I contatti dell'allieva sono facoltativi, ma quando ci sono devono passare
// lo stesso controllo di quelli dei genitori: un'email che il genitore non
// potrebbe avere non deve poterla avere nemmeno l'allieva.

const ALLIEVA = {
  firstName: "Giulia",
  lastName: "Esposito",
  dateOfBirth: new Date("2010-05-12T00:00:00.000Z"),
  gender: "F" as const,
}

const GENITORE = {
  firstName: "Anna",
  lastName: "Esposito",
  phone: "+39 333 1234567",
  receivesEmailCommunications: true,
  remindersEnabled: true,
}

function allievaOk(values: Record<string, unknown>) {
  return athleteCreateSchema.safeParse({ ...ALLIEVA, ...values }).success
}

function genitoreEmailOk(email: string) {
  return parentCreateSchema.safeParse({ ...GENITORE, email }).success
}

describe("contatti dell'allieva", () => {
  it("si può creare un'allieva senza email né telefono", () => {
    expect(athleteCreateSchema.safeParse(ALLIEVA).success).toBe(true)
  })

  it("accetta i campi vuoti come assenti", () => {
    expect(allievaOk({ email: "", phone: "" })).toBe(true)
  })

  it("accetta email e telefono validi", () => {
    expect(
      allievaOk({ email: "giulia@example.it", phone: "+39 333 1234567" }),
    ).toBe(true)
  })

  it("rifiuta un'email malformata", () => {
    const result = athleteCreateSchema.safeParse({
      ...ALLIEVA,
      email: "giulia@",
    })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues[0]?.message).toBe("Email non valida")
  })

  it("rifiuta un telefono malformato", () => {
    expect(allievaOk({ phone: "12" })).toBe(false)
  })
})

describe("stessa validazione dell'email dei genitori", () => {
  const casi = [
    "giulia@example.it",
    "nome.cognome+tag@example.co.uk",
    "giulia@",
    "@example.it",
    "senza-chiocciola",
    "due@@chiocciole.it",
    "spazio dentro@example.it",
  ]

  it.each(casi)("allieva e genitore trattano '%s' allo stesso modo", (email) => {
    expect(allievaOk({ email })).toBe(genitoreEmailOk(email))
  })
})
