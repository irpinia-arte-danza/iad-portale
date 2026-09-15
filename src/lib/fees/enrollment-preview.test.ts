import { describe, expect, it } from "vitest"

import { dateOnly } from "@/lib/utils/date-only"

import { enrollmentPreview } from "./enrollment-preview"

const academicYear = {
  startDate: dateOnly(2026, 8, 1),
  label: "2026-2027",
  monthlyRenewalDay: 10,
  associationFeeCents: 3000,
}

const iso = (d: Date) => d.toISOString().slice(0, 10)

describe("enrollmentPreview", () => {
  it("corso da 45 € il 15/09: 10 rate da settembre a giugno, quota associativa nuova", () => {
    const preview = enrollmentPreview({
      enrollmentDate: dateOnly(2026, 8, 15),
      monthlyFeeCents: 4500,
      academicYear,
      hasAssociationFee: false,
    })
    expect(preview.zeroFeeCourse).toBe(false)
    expect(preview.monthly?.count).toBe(10)
    expect(preview.monthly?.amountCents).toBe(4500)
    expect(iso(preview.monthly!.firstDueDate)).toBe("2026-09-10")
    expect(iso(preview.monthly!.lastDueDate)).toBe("2027-06-10")
    expect(preview.association).toEqual({
      kind: "new",
      amountCents: 3000,
      dueDate: dateOnly(2026, 8, 15),
    })
  })

  it("corso a 0 €: nessuna rata, segnalato", () => {
    const preview = enrollmentPreview({
      enrollmentDate: dateOnly(2026, 8, 15),
      monthlyFeeCents: 0,
      academicYear,
      hasAssociationFee: false,
    })
    expect(preview.zeroFeeCourse).toBe(true)
    expect(preview.monthly).toBeNull()
  })

  it("data oltre la fine dei corsi: nessuna rata, ma non è un corso a 0 €", () => {
    const preview = enrollmentPreview({
      enrollmentDate: dateOnly(2027, 6, 5),
      monthlyFeeCents: 4000,
      academicYear,
      hasAssociationFee: false,
    })
    expect(preview.monthly).toBeNull()
    expect(preview.zeroFeeCourse).toBe(false)
  })

  it("secondo corso: quota associativa già presente", () => {
    const preview = enrollmentPreview({
      enrollmentDate: dateOnly(2026, 8, 15),
      monthlyFeeCents: 4000,
      academicYear,
      hasAssociationFee: true,
    })
    expect(preview.association).toEqual({ kind: "existing" })
  })

  it("quota associativa dell'anno non impostata", () => {
    const preview = enrollmentPreview({
      enrollmentDate: dateOnly(2026, 8, 15),
      monthlyFeeCents: 4000,
      academicYear: { ...academicYear, associationFeeCents: 0 },
      hasAssociationFee: false,
    })
    expect(preview.association).toEqual({ kind: "not-set" })
  })
})
