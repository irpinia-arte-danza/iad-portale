import { describe, expect, it } from "vitest"

import {
  matchAthlete,
  namesMatch,
  personTokensFromPdf,
  sameBirthDay,
  type MatchCandidate,
} from "./name-match"

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

const GIULIA: MatchCandidate = {
  id: "giulia",
  firstName: "Giulia",
  lastName: "Esposito",
  dateOfBirth: d("2010-05-12"),
}

describe("personTokensFromPdf", () => {
  it("butta via le etichette del PDF", () => {
    expect(personTokensFromPdf("NOME COGNOME GIULIA ESPOSITO")).toEqual([
      "GIULIA",
      "ESPOSITO",
    ])
  })

  it("tiene le sigle di una lettera: possono essere un apostrofo staccato", () => {
    expect(personTokensFromPdf("ANNA D ANGELO")).toEqual([
      "ANNA",
      "D",
      "ANGELO",
    ])
  })
})

describe("namesMatch", () => {
  it("ignora accenti e maiuscole", () => {
    expect(
      namesMatch(personTokensFromPdf("NICOLO RUSSO"), {
        firstName: "Nicolò",
        lastName: "Russo",
      }),
    ).toBe(true)
  })

  it("ignora gli apostrofi", () => {
    expect(
      namesMatch(personTokensFromPdf("ANNA D ANGELO"), {
        firstName: "Anna",
        lastName: "D'Angelo",
      }),
    ).toBe(true)
  })

  it("accetta nome e cognome invertiti", () => {
    expect(
      namesMatch(personTokensFromPdf("ESPOSITO GIULIA"), {
        firstName: "Giulia",
        lastName: "Esposito",
      }),
    ).toBe(true)
  })

  it("accetta il doppio nome staccato o attaccato", () => {
    expect(
      namesMatch(personTokensFromPdf("MARIA GRAZIA ROSSI"), {
        firstName: "Mariagrazia",
        lastName: "Rossi",
      }),
    ).toBe(true)
    expect(
      namesMatch(personTokensFromPdf("MARIAGRAZIA ROSSI"), {
        firstName: "Maria Grazia",
        lastName: "Rossi",
      }),
    ).toBe(true)
  })

  it("ignora un'iniziale puntata in mezzo", () => {
    expect(
      namesMatch(personTokensFromPdf("GIULIA M. ESPOSITO"), {
        firstName: "Giulia",
        lastName: "Esposito",
      }),
    ).toBe(true)
  })

  it("non accetta un cognome diverso", () => {
    expect(
      namesMatch(personTokensFromPdf("GIULIA ESPOSITI"), {
        firstName: "Giulia",
        lastName: "Esposito",
      }),
    ).toBe(false)
  })

  it("non accetta un nome vuoto", () => {
    expect(namesMatch([], { firstName: "Giulia", lastName: "Esposito" })).toBe(
      false,
    )
  })
})

describe("sameBirthDay", () => {
  it("confronta il giorno, non l'istante", () => {
    expect(
      sameBirthDay(d("2010-05-12"), new Date("2010-05-12T23:30:00.000Z")),
    ).toBe(true)
  })

  it("distingue due giorni vicini", () => {
    expect(sameBirthDay(d("2010-05-12"), d("2010-05-13"))).toBe(false)
  })
})

describe("matchAthlete", () => {
  it("abbina nome tollerante e data di nascita esatta", () => {
    expect(
      matchAthlete(
        { tokens: ["ESPOSITO", "GIULIA"], dateOfBirth: d("2010-05-12") },
        [GIULIA],
      ),
    ).toEqual({ status: "matched", athleteId: "giulia" })
  })

  it("non abbina se la data di nascita è diversa di un giorno", () => {
    expect(
      matchAthlete(
        { tokens: ["GIULIA", "ESPOSITO"], dateOfBirth: d("2010-05-13") },
        [GIULIA],
      ),
    ).toEqual({ status: "not_found" })
  })

  it("non abbina un'omonima con data di nascita diversa", () => {
    const omonima: MatchCandidate = {
      id: "altra",
      firstName: "Giulia",
      lastName: "Esposito",
      dateOfBirth: d("2012-01-03"),
    }
    expect(
      matchAthlete(
        { tokens: ["GIULIA", "ESPOSITO"], dateOfBirth: d("2010-05-12") },
        [GIULIA, omonima],
      ),
    ).toEqual({ status: "matched", athleteId: "giulia" })
  })

  it("segnala l'ambiguità quando due allieve coincidono in tutto", () => {
    const gemella: MatchCandidate = { ...GIULIA, id: "gemella" }
    expect(
      matchAthlete(
        { tokens: ["GIULIA", "ESPOSITO"], dateOfBirth: d("2010-05-12") },
        [GIULIA, gemella],
      ),
    ).toEqual({ status: "ambiguous", athleteIds: ["giulia", "gemella"] })
  })
})
