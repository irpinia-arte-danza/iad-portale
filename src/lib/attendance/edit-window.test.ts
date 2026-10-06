import { describe, expect, it } from "vitest"

import { attendanceEditCutoff } from "./edit-window"

describe("attendanceEditCutoff", () => {
  it("sette giorni prima, a mezzanotte UTC, qualunque sia l'ora", () => {
    expect(attendanceEditCutoff(new Date("2026-10-07T22:30:00.000Z"))).toEqual(
      new Date("2026-09-30T00:00:00.000Z"),
    )
    // Una lezione di 7 giorni fa si corregge ancora, una di 8 no
    const cutoff = attendanceEditCutoff(new Date("2026-10-07T10:00:00.000Z"))
    expect(new Date("2026-09-30T00:00:00.000Z") < cutoff).toBe(false)
    expect(new Date("2026-09-29T00:00:00.000Z") < cutoff).toBe(true)
  })
})
