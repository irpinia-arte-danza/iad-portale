import { describe, expect, it } from "vitest"

import { isRecentOtpSession, RECENT_OTP_MINUTES } from "./recent-otp"

const NOW = Date.UTC(2026, 9, 7, 10, 0, 0)
const sec = (ms: number) => Math.floor(ms / 1000)

describe("isRecentOtpSession", () => {
  it("recovery di tre minuti fa → sì", () => {
    expect(
      isRecentOtpSession(
        { amr: [{ method: "recovery", timestamp: sec(NOW - 3 * 60_000) }] },
        NOW,
      ),
    ).toBe(true)
    expect(
      isRecentOtpSession(
        { amr: [{ method: "invite", timestamp: sec(NOW - 60_000) }] },
        NOW,
      ),
    ).toBe(true)
  })

  it("link aperto più di 15 minuti fa → no", () => {
    expect(
      isRecentOtpSession(
        {
          amr: [
            {
              method: "recovery",
              timestamp: sec(NOW - (RECENT_OTP_MINUTES + 1) * 60_000),
            },
          ],
        },
        NOW,
      ),
    ).toBe(false)
  })

  it("sessione nata da password → no, anche se recente", () => {
    expect(
      isRecentOtpSession(
        { amr: [{ method: "password", timestamp: sec(NOW - 10_000) }] },
        NOW,
      ),
    ).toBe(false)
  })

  it("claim mancante o malformato → no", () => {
    expect(isRecentOtpSession(null, NOW)).toBe(false)
    expect(isRecentOtpSession({}, NOW)).toBe(false)
    expect(isRecentOtpSession({ amr: "recovery" }, NOW)).toBe(false)
    expect(isRecentOtpSession({ amr: [{ method: "recovery" }] }, NOW)).toBe(false)
    expect(
      isRecentOtpSession({ amr: [{ method: "recovery", timestamp: "ieri" }] }, NOW),
    ).toBe(false)
  })

  it("una voce recente basta anche se ce ne sono altre vecchie", () => {
    expect(
      isRecentOtpSession(
        {
          amr: [
            { method: "password", timestamp: sec(NOW - 86_400_000) },
            { method: "recovery", timestamp: sec(NOW - 30_000) },
          ],
        },
        NOW,
      ),
    ).toBe(true)
  })
})
