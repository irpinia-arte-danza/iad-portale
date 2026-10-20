import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import type { ScheduleStatus } from "@prisma/client"

// «Segna come non dovuta» è una voce del menu «…» in Scadenze, Contributi e
// Panoramica; «Rimetti come dovuta» resta un tasto sulle non dovute, e
// Incassa resta tasto. Si guarda il markup: il dialog chiuso non esce, e il
// menu di Radix (che sta in un portale e da chiuso non rende niente) è
// sostituito da uno che mette le voci in linea, marcate data-menu-item.

vi.mock("@/app/(admin)/admin/athletes/schedules-actions", () => ({
  waiveSchedule: async () => ({ ok: true }),
  unwaiveSchedule: async () => ({ ok: true }),
  updateScheduleAmount: async () => ({ ok: true }),
}))
vi.mock("@/components/ui/dropdown-menu", () => {
  const Pass = ({ children }: { children?: React.ReactNode }) => <>{children}</>
  return {
    DropdownMenu: Pass,
    DropdownMenuTrigger: Pass,
    DropdownMenuContent: ({ children }: { children?: React.ReactNode }) => <div data-menu>{children}</div>,
    DropdownMenuItem: ({ children }: { children?: React.ReactNode }) => <div data-menu-item>{children}</div>,
    DropdownMenuSeparator: () => null,
  }
})
vi.mock("./schedule-settle-provider", () => ({ useOpenScheduleSettle: () => () => {} }))
vi.mock("@/components/athletes/athlete-card-link", () => ({
  AthleteCardLink: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}))

const { ScheduleRowActions } = await import("./schedule-row-actions")
const { ScadenzaRow } = await import("../../scadenze/_components/scadenza-row")
const { WaiveScheduleMenu } = await import("./schedule-waive-actions")

// La voce nel menu, e nessun tasto «Non dovuta» fuori
const MENU_ITEM = /data-menu-item="true"><svg[^>]*>.*?<\/svg>Segna come non dovuta</
const hasMenuItem = (html: string) => MENU_ITEM.test(html)
const hasButton = (html: string) => /<button[^>]*>(<svg[^>]*>.*?<\/svg>)?Non dovuta<\/button>/.test(html)

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

describe("Scadenze: «Segna come non dovuta» nel menu «…»", () => {
  it.each(["DUE", "OVERDUE"] as const)("rata %s → voce nel menu, Incassa resta tasto", (status) => {
    const html = scadenzeRow(status)
    expect(hasMenuItem(html)).toBe(true)
    expect(hasButton(html)).toBe(false)
    expect(html).toMatch(/<button[^>]*>.*?Incassa<\/button>/)
  })

  it.each(["PAID", "WAIVED"] as const)("rata %s → nessuna voce", (status) => {
    const html = scadenzeRow(status)
    expect(hasMenuItem(html)).toBe(false)
    expect(hasButton(html)).toBe(false)
  })
})

describe("Contributi: voce nel menu, Rimetti come dovuta resta tasto", () => {
  it.each([
    ["DUE", "OVERDUE"],
    ["DUE", "DUE"],
    ["OVERDUE", "OVERDUE"],
  ] as const)("rata %s (%s) → Incassa tasto, voce nel menu", (status, display) => {
    const html = contributiRow(status, display)
    expect(html).toMatch(/<button[^>]*>.*?Incassa<\/button>/)
    expect(hasMenuItem(html)).toBe(true)
    expect(hasButton(html)).toBe(false)
    expect(html).not.toContain("Rimetti come dovuta")
  })

  it("pagata: niente voce, niente Incassa", () => {
    const html = contributiRow("PAID")
    expect(hasMenuItem(html)).toBe(false)
    expect(html).not.toContain("Incassa")
    expect(html).not.toContain("Rimetti come dovuta")
  })

  it("non dovuta: «Rimetti come dovuta» come tasto, niente voce", () => {
    const html = contributiRow("WAIVED")
    expect(html).toMatch(/<button[^>]*>.*?Rimetti come dovuta<\/button>/)
    expect(hasMenuItem(html)).toBe(false)
  })
})

describe("Panoramica: menu «…» con la sola voce", () => {
  const panoramica = (status: ScheduleStatus) =>
    renderToStaticMarkup(
      <WaiveScheduleMenu
        schedule={{ id: "s1", status, courseName: "Classico 1", dueDate, amountCents: 4000 }}
      />,
    )

  it.each(["DUE", "OVERDUE"] as const)("rata %s → menu con la voce", (status) => {
    const html = panoramica(status)
    expect(html).toContain('aria-label="Altre azioni"')
    expect(hasMenuItem(html)).toBe(true)
  })

  it.each(["PAID", "WAIVED"] as const)("rata %s → nessun menu", (status) => {
    expect(panoramica(status)).toBe("")
  })
})
