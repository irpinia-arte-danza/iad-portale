import { describe, expect, it } from "vitest"
import type { Prisma } from "@prisma/client"

import { dateOnly } from "@/lib/utils/date-only"

import { generateMonthlySchedulesForEnrollment } from "./schedule-generator"

// Iscrizione il 28/09/2026 con «non dovuto» per settembre: la rata di
// settembre nasce WAIVED con il motivo, ottobre e i mesi dopo DUE.

function fakeTx(enrollmentDate: Date) {
  const created: Array<Record<string, unknown>> = []
  const tx = {
    courseEnrollment: {
      findUnique: async () => ({
        id: "e1",
        enrollmentDate,
        course: { monthlyFeeCents: 4000 },
        academicYear: {
          id: "y1",
          label: "2026-2027",
          startDate: dateOnly(2026, 8, 1),
          monthlyRenewalDay: 10,
        },
      }),
    },
    paymentSchedule: {
      createMany: async ({ data }: { data: Array<Record<string, unknown>> }) => {
        created.push(...data)
        return { count: data.length }
      },
    },
  }
  return { tx: tx as unknown as Prisma.TransactionClient, created }
}

const iso = (d: unknown) => (d as Date).toISOString().slice(0, 10)

describe("generateMonthlySchedulesForEnrollment e la rata del primo mese", () => {
  it("28/09 con «non dovuto»: settembre WAIVED, ottobre DUE", async () => {
    const { tx, created } = fakeTx(dateOnly(2026, 8, 28))
    const count = await generateMonthlySchedulesForEnrollment(tx, "e1", "admin", { kind: "WAIVED" })

    expect(count).toBe(10) // settembre → giugno
    expect(created[0]).toMatchObject({
      status: "WAIVED",
      waiverReason: "iscrizione del 28/09/2026",
      amountCents: 4000,
    })
    expect(iso(created[0].dueDate)).toBe("2026-09-10")
    expect(created[1]).toMatchObject({ status: "DUE", waiverReason: null, amountCents: 4000 })
    expect(iso(created[1].dueDate)).toBe("2026-10-10")
    expect(created.slice(1).every((r) => r.status === "DUE")).toBe(true)
  })

  it("senza scelta: come prima, tutte DUE piene", async () => {
    const { tx, created } = fakeTx(dateOnly(2026, 8, 28))
    await generateMonthlySchedulesForEnrollment(tx, "e1", "admin")
    expect(created.every((r) => r.status === "DUE" && r.amountCents === 4000)).toBe(true)
  })
})
