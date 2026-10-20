import { describe, expect, expectTypeOf, it, vi } from "vitest"

vi.mock("@/lib/prisma", () => ({ prisma: {} }))
vi.mock("@/lib/auth/require-card-manager", () => ({ requireCardManager: vi.fn() }))
vi.mock("@/app/(admin)/admin/tessere/queries", () => ({ tesseramentoQueueWhere: vi.fn() }))

const {
  CARD_MANAGER_CARD_SELECT,
  CARD_MANAGER_QUEUE_SELECT,
  missingCardFields,
} = await import("./manager-queries")
import type { CardManagerCardRow, CardManagerQueueRow } from "./manager-queries"

// Quello che il referente tessere non deve mai vedere. Come per gli
// insegnanti (#49): il controllo è sul tipo del risultato e sul select.
const FORBIDDEN = [
  "email",
  "phone",
  "parentRelations",
  "parents",
  "contactName",
  "contactEmail",
  "contactPhone",
  "medicalCertificates",
  "payments",
  "paymentSchedules",
  "notes",
  "instructorNotes",
  "gender",
] as const
type Forbidden = (typeof FORBIDDEN)[number]

describe("query del referente tessere", () => {
  it("il tipo della coda non contiene contatti, genitori, certificati, pagamenti, note", () => {
    expectTypeOf<Extract<keyof CardManagerQueueRow, Forbidden>>().toEqualTypeOf<never>()
    expectTypeOf<Extract<keyof CardManagerCardRow, Forbidden>>().toEqualTypeOf<never>()
  })

  it("il select della coda è esattamente l'elenco dei dati che l'ente chiede", () => {
    expect(Object.keys(CARD_MANAGER_QUEUE_SELECT).sort()).toEqual(
      [
        "id",
        "lastName",
        "firstName",
        "dateOfBirth",
        "placeOfBirth",
        "provinceOfBirth",
        "fiscalCode",
        "residenceStreet",
        "residenceNumber",
        "residenceCity",
        "residenceProvince",
        "residenceCap",
      ].sort(),
    )
    for (const key of FORBIDDEN) expect(Object.keys(CARD_MANAGER_QUEUE_SELECT)).not.toContain(key)
  })

  it("delle tessere esce solo numero, scadenza e nome dell'allieva", () => {
    expect(Object.keys(CARD_MANAGER_CARD_SELECT).sort()).toEqual(["athlete", "cardNumber", "expiryDate", "id"])
    expect(Object.keys(CARD_MANAGER_CARD_SELECT.athlete.select).sort()).toEqual(["firstName", "lastName"])
  })

  it("segnala i dati che mancano per tesserare, senza contare i contatti", () => {
    const missing = missingCardFields({
      id: "x",
      lastName: "Rossi",
      firstName: "Mia",
      dateOfBirth: new Date("2014-05-05"),
      placeOfBirth: "Avellino",
      provinceOfBirth: "AV",
      fiscalCode: null,
      residenceStreet: "Via Roma",
      residenceNumber: "1",
      residenceCity: "Montella",
      residenceProvince: "AV",
      residenceCap: " ",
    })
    expect(missing).toEqual(["codice fiscale", "CAP"])
  })
})
