import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import type { ScheduleStatus } from "@prisma/client"

// «Non dovuta» come tasto in Scadenze e in Contributi, «Rimetti come
// dovuta» sulle non dovute. Si guarda il markup: il dialog chiuso non esce.

vi.mock("@/app/(admin)/admin/athletes/schedules-actions", () => ({
  waiveSchedule: async () => ({ ok: true }),
  unwaiveSchedule: async () => ({ ok: true }),
  updateScheduleAmount: async () => ({ ok: true }),
}))
vi.mock("./schedule-settle-provider", () => ({ useOpenScheduleSettle: () => () => {} }))
vi.mock("@/components/athletes/athlete-card-link", () => ({
  AthleteCardLink: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}))

const { ScheduleRowActions } = await import("./schedule-row-actions")
const { ScadenzaRow } = await import("../../scadenze/_components/scadenza-row")

const dueDate = new Date("2026-09-10T00:00:00Z")

function contributiRow(status: ScheduleStatus, displayStatus = status as string) {
  return renderToStaticMarkup(
    <ScheduleRowActions
      schedule={{
        id: "s1",
        status,
        displayStatus: displayStatus as never,
        feeType: "MONTHLY",
        courseEnrollmentId: "e1",
        courseName: "Classico 1",
        dueDate,
        amountCents: 4000,
        waiverReason: status === "WAIVED" ? "mese di chiusura" : null,
        paymentId: status === "PAID" ? "p1" : null,
        referenceAmountCents: 4000,
      }}
    />,
  )
}

function scadenzeRow(status: ScheduleStatus) {
  return renderToStaticMarkup(
    <ScadenzaRow
      scadenza={{
        id: "s1",
        dueDate,
        amountCents: 4000,
        status,
        feeType: "MONTHLY",
        notes: null,
        giorniRitardo: 40,
        athlete: { id: "a1", firstName: "Mia", lastName: "Rossi" },
        contact: { name: "Anna Alfa", email: "anna@prova.local", phone: null, isAthlete: false, parentId: "p1" },
        courseEnrollmentId: "e1",
        lastMethod: null,
        course: { id: "c1", name: "Classico 1", monthlyFeeCents: 4000 },
        academicYear: { id: "y1", label: "2026/2027" },
        reminders: { emailCount: 0, whatsappCount: 0, lastAt: null } as never,
      }}
      selected={false}
      onSelectedChange={() => {}}
      onIncassa={() => {}}
      onSollecita={() => {}}
      onEditAmount={() => {}}
    />,
  )
}

describe("Scadenze: tasto «Non dovuta» accanto a Incassa", () => {
  it.each(["DUE", "OVERDUE"] as const)("rata %s → tasto", (status) => {
    const html = scadenzeRow(status)
    expect(html).toContain("Non dovuta")
    expect(html.indexOf("Incassa")).toBeLessThan(html.indexOf("Non dovuta"))
  })

  it.each(["PAID", "WAIVED"] as const)("rata %s → niente tasto", (status) => {
    expect(scadenzeRow(status)).not.toContain("Non dovuta")
  })
})

describe("Contributi: tasti in vista, menu per il resto", () => {
  it("rata in ritardo: Incassa e Non dovuta, niente «Rimetti»", () => {
    const html = contributiRow("DUE", "OVERDUE")
    expect(html).toContain("Incassa")
    expect(html).toContain("Non dovuta")
    expect(html).not.toContain("Rimetti come dovuta")
  })

  it("vecchio stato OVERDUE: Non dovuta", () => {
    expect(contributiRow("OVERDUE")).toContain("Non dovuta")
  })

  it("pagata: nessuno dei due", () => {
    const html = contributiRow("PAID")
    expect(html).not.toContain("Non dovuta")
    expect(html).not.toContain("Rimetti come dovuta")
    expect(html).not.toContain("Incassa")
  })

  it("non dovuta: «Rimetti come dovuta», non «Non dovuta»", () => {
    const html = contributiRow("WAIVED")
    expect(html).toContain("Rimetti come dovuta")
    expect(html).not.toContain(">Non dovuta")
  })
})
