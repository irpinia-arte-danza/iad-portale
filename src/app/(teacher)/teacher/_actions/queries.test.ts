import { describe, expectTypeOf, it } from "vitest"

import type { CourseRosterRow } from "./queries"

// Il tipo che la pagina del corso riceve: se qualcuno riaggiunge i genitori
// alla select, qui il build si ferma. L'insegnante vede le allieve, non chi
// le accompagna né come raggiungerlo.
describe("getCourseRoster", () => {
  it("non restituisce genitori, telefoni né email", () => {
    type Athlete = CourseRosterRow["athlete"]
    expectTypeOf<Athlete>().toHaveProperty("firstName")
    expectTypeOf<Athlete>().toHaveProperty("lastName")
    expectTypeOf<Athlete>().toHaveProperty("dateOfBirth")
    expectTypeOf<Athlete>().toHaveProperty("medicalCertificates")
    expectTypeOf<Athlete>().not.toHaveProperty("parentRelations")
    expectTypeOf<Athlete>().not.toHaveProperty("phone")
    expectTypeOf<Athlete>().not.toHaveProperty("email")
    expectTypeOf<Athlete>().not.toHaveProperty("fiscalCode")
    expectTypeOf<Athlete>().not.toHaveProperty("address")
    // Del certificato solo la scadenza: niente file né medico
    type Cert = Athlete["medicalCertificates"][number]
    expectTypeOf<Cert>().toEqualTypeOf<{ expiryDate: Date }>()
  })
})
