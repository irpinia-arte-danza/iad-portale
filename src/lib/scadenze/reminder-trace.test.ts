import { describe, expect, it } from "vitest"

import {
  NEVER_REMINDED,
  reminderSummaryLabel,
  summarizeReminders,
  type ReminderTrace,
} from "./reminder-trace"

const OGGI = new Date("2026-10-06T09:00:00.000Z")
const t = (iso: string, channel: "EMAIL" | "WHATSAPP"): ReminderTrace => ({
  at: new Date(iso),
  channel,
})

describe("storia dei solleciti", () => {
  it("mai sollecitata", () => {
    expect(summarizeReminders([])).toEqual(NEVER_REMINDED)
    expect(reminderSummaryLabel(NEVER_REMINDED, OGGI)).toBe("Mai sollecitata")
  })

  it("conta tutti i canali e tiene l'ultimo", () => {
    const summary = summarizeReminders([
      t("2026-09-20T10:00:00.000Z", "EMAIL"),
      t("2026-09-28T17:00:00.000Z", "WHATSAPP"),
    ])
    expect(summary.count).toBe(2)
    expect(summary.last?.channel).toBe("WHATSAPP")
    expect(reminderSummaryLabel(summary, OGGI)).toBe(
      "Sollecitata 2 volte · ultima 28/09/2026 su WhatsApp",
    )
  })

  it("una volta sola, per email", () => {
    const summary = summarizeReminders([t("2026-09-20T10:00:00.000Z", "EMAIL")])
    expect(reminderSummaryLabel(summary, OGGI)).toBe(
      "Sollecitata 1 volta · ultima 20/09/2026 per email",
    )
  })

  it("l'ordine di arrivo non conta", () => {
    const traces = [
      t("2026-09-28T17:00:00.000Z", "WHATSAPP"),
      t("2026-09-20T10:00:00.000Z", "EMAIL"),
    ]
    expect(summarizeReminders(traces).last?.channel).toBe("WHATSAPP")
  })

  it("un sollecito di oggi si dice «oggi», anche a tarda sera", () => {
    const summary = summarizeReminders([t("2026-10-06T21:30:00.000Z", "WHATSAPP")])
    expect(reminderSummaryLabel(summary, OGGI)).toBe(
      "Sollecitata 1 volta · ultima oggi su WhatsApp",
    )
  })
})
