import { beforeEach, describe, expect, it, vi } from "vitest"

// ─────────────────────────────────────────────────────────────────────────
// Lo storico con un database in memoria e Next finto (headers, cookies,
// after). Prova il nocciolo: dispositivo nuovo → una email, stesso
// dispositivo → niente, paese estero → email, cinque fallimenti → UNA sola
// email, «Dimentica» → di nuovo nuovo, pulizia a 90 giorni.
// ─────────────────────────────────────────────────────────────────────────

type LoginRow = {
  id: string
  userId: string
  outcome: string
  ip: string
  country: string | null
  device: string
  deviceId: string | null
  newDevice: boolean
  sessionId: string | null
  createdAt: Date
}
type DeviceRow = {
  id: string
  userId: string
  deviceId: string
  label: string
  firstSeenAt: Date
  lastSeenAt: Date
  forgottenAt: Date | null
}
const logins: LoginRow[] = []
const devices: DeviceRow[] = []
let seq = 0
const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`

const request = {
  headers: new Map<string, string>(),
  cookies: new Map<string, string>(),
}
const notices: unknown[] = []

vi.mock("next/headers", () => ({
  headers: async () => ({ get: (k: string) => request.headers.get(k.toLowerCase()) ?? null }),
  cookies: async () => ({
    get: (k: string) => (request.cookies.has(k) ? { value: request.cookies.get(k) } : undefined),
    set: (k: string, v: string) => request.cookies.set(k, v),
  }),
}))
// after(): in produzione parte dopo la risposta; qui subito
vi.mock("next/server", () => ({ after: (fn: () => unknown) => void fn() }))
vi.mock("./security-notice-email", () => ({
  sendSecurityNotice: async (n: unknown) => {
    notices.push(n)
  },
}))

function matchWhere<T extends Record<string, unknown>>(row: T, where: Record<string, unknown>): boolean {
  return Object.entries(where).every(([k, v]) => {
    if (k === "OR") return (v as Record<string, unknown>[]).some((w) => matchWhere(row, w))
    if (k === "NOT") return !matchWhere(row, v as Record<string, unknown>)
    const value = row[k]
    if (v !== null && typeof v === "object" && !(v instanceof Date)) {
      const cond = v as Record<string, unknown>
      if ("in" in cond) return (cond.in as unknown[]).includes(value)
      if ("gte" in cond) return (value as Date).getTime() >= (cond.gte as Date).getTime()
      if ("lt" in cond) return value !== null && (value as Date).getTime() < (cond.lt as Date).getTime()
      if ("equals" in cond) return String(value).toLowerCase() === String(cond.equals).toLowerCase()
    }
    return value === v
  })
}

vi.mock("@/lib/prisma", () => {
  const adminLogin = {
    create: async ({
      data,
    }: {
      data: Pick<LoginRow, "userId" | "outcome" | "ip" | "device"> &
        Partial<Pick<LoginRow, "country" | "deviceId" | "newDevice" | "sessionId" | "createdAt">>
    }) => {
      const row: LoginRow = {
        id: uuid(),
        createdAt: new Date(),
        country: null,
        deviceId: null,
        newDevice: false,
        sessionId: null,
        ...data,
      }
      logins.push(row)
      return row
    },
    findMany: async ({ where }: { where: Record<string, unknown> }) =>
      logins.filter((r) => matchWhere(r, where)),
    findFirst: async ({ where }: { where: Record<string, unknown> }) =>
      [...logins]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .find((r) => matchWhere(r, where)) ?? null,
    deleteMany: async ({ where }: { where: Record<string, unknown> }) => {
      const before = logins.length
      for (let i = logins.length - 1; i >= 0; i--) if (matchWhere(logins[i], where)) logins.splice(i, 1)
      return { count: before - logins.length }
    },
  }
  const adminDevice = {
    findUnique: async ({ where }: { where: { userId_deviceId: { userId: string; deviceId: string } } }) =>
      devices.find(
        (d) => d.userId === where.userId_deviceId.userId && d.deviceId === where.userId_deviceId.deviceId,
      ) ?? null,
    create: async ({ data }: { data: Omit<DeviceRow, "id" | "forgottenAt"> }) => {
      const row: DeviceRow = { id: uuid(), forgottenAt: null, ...data }
      devices.push(row)
      return row
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<DeviceRow> }) => {
      const row = devices.find((d) => d.id === where.id)!
      Object.assign(row, data)
      return row
    },
    updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Partial<DeviceRow> }) => {
      const hits = devices.filter((d) => matchWhere(d, where))
      hits.forEach((d) => Object.assign(d, data))
      return { count: hits.length }
    },
    findMany: async ({ where }: { where: Record<string, unknown> }) => devices.filter((d) => matchWhere(d, where)),
    deleteMany: async ({ where }: { where: Record<string, unknown> }) => {
      const before = devices.length
      for (let i = devices.length - 1; i >= 0; i--) if (matchWhere(devices[i], where)) devices.splice(i, 1)
      return { count: before - devices.length }
    },
  }
  return {
    prisma: {
      adminLogin,
      adminDevice,
      user: { findFirst: async () => null },
      $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
    },
  }
})

process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-di-prova"

const {
  forgetKnownDevice,
  listKnownDevices,
  previousSuccessfulLogin,
  purgeOldAdminLogins,
  recordAdminFailure,
  recordAdminSuccess,
} = await import("./admin-logins")

const USER = "a0000000-0000-4000-8000-00000000ad01"
const IPAD =
  "Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1"

function resetRequest(country: string | null = "IT") {
  request.headers.clear()
  request.headers.set("user-agent", IPAD)
  request.headers.set("x-forwarded-for", "93.1.2.3")
  if (country) request.headers.set("x-vercel-ip-country", country)
}

describe("accessi admin", () => {
  beforeEach(() => {
    logins.length = 0
    devices.length = 0
    notices.length = 0
    request.cookies.clear()
    resetRequest()
  })

  it("primo accesso: dispositivo nuovo, cookie emesso, una email; il secondo dallo stesso browser tace", async () => {
    await recordAdminSuccess({ userId: USER, sessionId: "s1" })
    expect(logins).toHaveLength(1)
    expect(logins[0]).toMatchObject({ outcome: "OK", newDevice: true, device: "Safari su iPad", country: "IT" })
    expect(request.cookies.get("iad_device")).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/)
    expect(notices).toEqual([expect.objectContaining({ kind: "login", anomalies: ["new-device"] })])

    await recordAdminSuccess({ userId: USER, sessionId: "s2" })
    expect(logins[1]).toMatchObject({ outcome: "OK", newDevice: false })
    expect(notices).toHaveLength(1)
    expect(await listKnownDevices(USER)).toHaveLength(1)
  })

  it("stesso dispositivo ma dalla Francia: email «dall'estero»", async () => {
    await recordAdminSuccess({ userId: USER, sessionId: "s1" })
    notices.length = 0
    resetRequest("FR")
    await recordAdminSuccess({ userId: USER, sessionId: "s2" })
    expect(notices).toEqual([expect.objectContaining({ kind: "login", anomalies: ["foreign-country"], country: "FR" })])
  })

  it("un cookie firmato con un'altra chiave vale come nessun cookie: dispositivo nuovo", async () => {
    await recordAdminSuccess({ userId: USER, sessionId: "s1" })
    const good = request.cookies.get("iad_device")!
    request.cookies.set("iad_device", good.replace(/\.[^.]+$/, ".firmaSbagliata"))
    await recordAdminSuccess({ userId: USER, sessionId: "s2" })
    expect(logins[1].newDevice).toBe(true)
    expect(request.cookies.get("iad_device")).not.toBe(good)
  })

  it("«Dimentica»: il login successivo è di nuovo «nuovo», poi torna conosciuto", async () => {
    await recordAdminSuccess({ userId: USER, sessionId: "s1" })
    const [device] = await listKnownDevices(USER)
    expect(await forgetKnownDevice(USER, device.id)).toBe(true)
    expect(await listKnownDevices(USER)).toHaveLength(0)
    // Una seconda volta non c'è più niente da dimenticare
    expect(await forgetKnownDevice(USER, device.id)).toBe(false)

    await recordAdminSuccess({ userId: USER, sessionId: "s2" })
    expect(logins[1].newDevice).toBe(true)
    expect(await listKnownDevices(USER)).toHaveLength(1)
    await recordAdminSuccess({ userId: USER, sessionId: "s3" })
    expect(logins[2].newDevice).toBe(false)
  })

  it("cinque fallimenti in dieci minuti: una sola email, al quinto; «bloccato» non ne manda altre", async () => {
    for (let i = 0; i < 4; i++) await recordAdminFailure(USER, "WRONG_PASSWORD")
    expect(notices).toHaveLength(0)
    await recordAdminFailure(USER, "WRONG_MFA")
    expect(notices).toEqual([expect.objectContaining({ kind: "failures", count: 5 })])
    await recordAdminFailure(USER, "BLOCKED")
    await recordAdminFailure(USER, "BLOCKED")
    expect(notices).toHaveLength(1)
    expect(logins.map((l) => l.outcome)).toEqual([
      "WRONG_PASSWORD",
      "WRONG_PASSWORD",
      "WRONG_PASSWORD",
      "WRONG_PASSWORD",
      "WRONG_MFA",
      "BLOCKED",
      "BLOCKED",
    ])
  })

  it("l'accesso precedente esclude la sessione corrente", async () => {
    await recordAdminSuccess({ userId: USER, sessionId: "s1" })
    await recordAdminSuccess({ userId: USER, sessionId: "s2" })
    const previous = await previousSuccessfulLogin(USER, "s2")
    expect(previous?.at).toEqual(logins[0].createdAt)
    expect(await previousSuccessfulLogin(USER, "s1")).toMatchObject({ at: logins[1].createdAt })
  })

  it("pulizia a 90 giorni: via gli accessi vecchi e i dispositivi non più visti", async () => {
    const now = new Date("2026-10-07T03:00:00Z")
    const old = new Date("2026-07-01T00:00:00Z")
    const recent = new Date("2026-09-30T00:00:00Z")
    logins.push(
      { id: uuid(), userId: USER, outcome: "OK", ip: "x", country: "IT", device: "d", deviceId: "a", newDevice: false, sessionId: null, createdAt: old },
      { id: uuid(), userId: USER, outcome: "OK", ip: "x", country: "IT", device: "d", deviceId: "a", newDevice: false, sessionId: null, createdAt: recent },
    )
    devices.push(
      { id: uuid(), userId: USER, deviceId: "stale", label: "d", firstSeenAt: old, lastSeenAt: old, forgottenAt: null },
      { id: uuid(), userId: USER, deviceId: "forgotten-long-ago", label: "d", firstSeenAt: old, lastSeenAt: recent, forgottenAt: old },
      { id: uuid(), userId: USER, deviceId: "live", label: "d", firstSeenAt: old, lastSeenAt: recent, forgottenAt: null },
    )
    expect(await purgeOldAdminLogins(now)).toEqual({ logins: 1, devices: 2 })
    expect(logins.map((l) => l.createdAt)).toEqual([recent])
    expect(devices.map((d) => d.deviceId)).toEqual(["live"])
  })
})
