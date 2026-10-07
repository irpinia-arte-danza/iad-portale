import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/prisma", () => ({ prisma: {} }))
vi.mock("@/lib/resend/send-email", () => ({ sendEmail: vi.fn() }))

const { composeSecurityNotice, SECURITY_MILESTONE } = await import("./security-notice-email")

const giusy = { email: "g@example.it", firstName: "Giuseppina", lastName: "Ciociola" }
const fede = { email: "f@example.it", firstName: "Federico", lastName: null }
const at = new Date("2026-10-06T19:03:00Z") // 21:03 a Roma (ora legale)

describe("composeSecurityNotice", () => {
  it("dispositivo nuovo: oggetto chiaro, quando e da dove in ora di Roma", () => {
    const { subject, lines } = composeSecurityNotice(
      { kind: "login", userId: "u", anomalies: ["new-device"], at, country: "IT", device: "Safari su iPad" },
      { subject: giusy },
    )
    expect(subject).toBe("Accesso al portale da un dispositivo nuovo")
    expect(lines[0]).toContain("Giuseppina Ciociola (g@example.it)")
    expect(lines[0]).toContain("21:03")
    expect(lines[0]).toContain("da Safari su iPad, Italia")
    expect(lines).toContainEqual(expect.stringContaining("mai visto prima"))
  })

  it("estero: il paese per esteso, in italiano", () => {
    const { subject, lines } = composeSecurityNotice(
      { kind: "login", userId: "u", anomalies: ["foreign-country"], at, country: "FR", device: "Chrome su Mac" },
      { subject: giusy },
    )
    expect(subject).toBe("Accesso al portale dall'estero (Francia)")
    expect(lines).toContainEqual(expect.stringContaining("non è l'Italia"))
  })

  it("dispositivo nuovo E estero: una sola email con entrambe le righe", () => {
    const { subject, lines } = composeSecurityNotice(
      { kind: "login", userId: "u", anomalies: ["new-device", "foreign-country"], at, country: "DE", device: "Chrome su Mac" },
      { subject: giusy },
    )
    expect(subject).toBe("Accesso al portale da un dispositivo nuovo, dall'estero")
    expect(lines.filter((l) => /mai visto|non è l'Italia/.test(l))).toHaveLength(2)
  })

  it("cinque falliti: quanti, per chi, e che l'accesso è bloccato", () => {
    const { subject, lines } = composeSecurityNotice(
      { kind: "failures", userId: "u", count: 5, at, country: null, device: "Dispositivo sconosciuto" },
      { subject: giusy },
    )
    expect(subject).toBe("5 tentativi di accesso falliti sull'account di Giuseppina")
    expect(lines[0]).toContain("paese sconosciuto")
    expect(lines[1]).toContain("bloccato per 15 minuti")
  })

  it("azzeramento del secondo fattore: chi l'ha fatto, per chi", () => {
    const { subject, lines } = composeSecurityNotice(
      { kind: "mfa-reset", byUserId: "f", targetUserId: "g", at },
      { subject: giusy, actor: fede },
    )
    expect(subject).toBe("Secondo fattore azzerato per Giuseppina")
    expect(lines[0]).toContain("Federico (f@example.it) ha azzerato il secondo fattore")
    expect(lines[0]).toContain("Giuseppina Ciociola")
  })

  it("ogni tipo ha la sua chiave in EmailLog", () => {
    expect(new Set(Object.values(SECURITY_MILESTONE)).size).toBe(3)
    for (const key of Object.values(SECURITY_MILESTONE)) expect(key.startsWith("SECURITY_")).toBe(true)
  })
})
