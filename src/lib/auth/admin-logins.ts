import "server-only"

import { cookies, headers } from "next/headers"
import { after } from "next/server"

import { AdminLoginOutcome, UserRole } from "@prisma/client"

import { logError } from "@/lib/logging/log-error"
import { prisma } from "@/lib/prisma"

import {
  DEVICE_COOKIE,
  DEVICE_COOKIE_DAYS,
  deviceKey,
  newDeviceId,
  signDeviceId,
  verifyDeviceCookie,
} from "./device-cookie"
import {
  adminLoginCutoff,
  FAILURE_ALERT_WINDOW_MINUTES,
  failureAlertDue,
  loginAnomalies,
} from "./login-anomaly"
import { clientIp } from "./login-attempts"
import { sendSecurityNotice } from "./security-notice-email"
import { describeUserAgent, type DeviceHint } from "./user-agent"

// ─────────────────────────────────────────────────────────────────────────
// Lo storico degli accessi degli admin (admin_logins) e i dispositivi
// conosciuti (admin_devices).
//
// Solo ruolo ADMIN. Ogni esito lascia una riga: riuscito, password errata,
// codice errato, bloccato. «Riuscito» è il login completo, secondo fattore
// compreso: con la sola password nessuno è dentro. Scrivere lo storico non
// deve mai far fallire il login: gli errori si loggano e basta.
// ─────────────────────────────────────────────────────────────────────────

export type AdminFailure = Exclude<AdminLoginOutcome, "OK">

function key(): Buffer {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) throw new Error("SUPABASE_SERVICE_ROLE_KEY mancante: cookie del dispositivo non firmabile")
  return deviceKey(secret)
}

type RequestFacts = { ip: string; country: string | null; device: string; deviceId: string | null }

async function requestFacts(hint: DeviceHint): Promise<RequestFacts> {
  const [h, jar] = await Promise.all([headers(), cookies()])
  const rawCountry = h.get("x-vercel-ip-country")?.trim().toUpperCase() ?? ""
  return {
    ip: await clientIp(),
    country: /^[A-Z]{2}$/.test(rawCountry) ? rawCountry : null,
    device: describeUserAgent(h.get("user-agent"), hint),
    deviceId: verifyDeviceCookie(key(), jar.get(DEVICE_COOKIE)?.value),
  }
}

// L'id del dispositivo di questo browser, se il cookie è integro
export async function currentDeviceId(): Promise<string | null> {
  const jar = await cookies()
  return verifyDeviceCookie(key(), jar.get(DEVICE_COOKIE)?.value)
}

async function setDeviceCookie(deviceId: string): Promise<void> {
  const jar = await cookies()
  jar.set(DEVICE_COOKIE, signDeviceId(key(), deviceId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DEVICE_COOKIE_DAYS * 86_400,
  })
}

// L'admin dietro un'email, se c'è: per gli esiti negativi del login, dove
// non esiste ancora una sessione. Chi non è admin non lascia righe qui.
export async function adminUserByEmail(email: string | null): Promise<string | null> {
  if (!email) return null
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" }, role: UserRole.ADMIN, deletedAt: null },
    select: { id: true },
  })
  return user?.id ?? null
}

export async function recordAdminFailure(
  userId: string,
  outcome: AdminFailure,
  hint: DeviceHint = {},
): Promise<void> {
  try {
    const facts = await requestFacts(hint)
    const now = new Date()
    await prisma.adminLogin.create({
      data: {
        userId,
        outcome,
        ip: facts.ip,
        country: facts.country,
        device: facts.device,
        deviceId: facts.deviceId,
      },
    })
    // «Bloccato» non è un nuovo fallimento: la finestra dei cinque è già
    // scattata, e l'email è già partita
    if (outcome === "BLOCKED") return

    const failures = await prisma.adminLogin.findMany({
      where: {
        userId,
        outcome: { in: ["WRONG_PASSWORD", "WRONG_MFA"] },
        createdAt: { gte: new Date(now.getTime() - FAILURE_ALERT_WINDOW_MINUTES * 60_000) },
      },
      select: { createdAt: true },
    })
    if (failureAlertDue(failures.map((f) => f.createdAt), now)) {
      after(() =>
        sendSecurityNotice({
          kind: "failures",
          userId,
          count: failures.length,
          at: now,
          country: facts.country,
          device: facts.device,
        }),
      )
    }
  } catch (error) {
    logError("[admin-logins] record failure", error, { outcome })
  }
}

export async function recordAdminSuccess(input: {
  userId: string
  sessionId: string | null
  hint?: DeviceHint
}): Promise<void> {
  try {
    const facts = await requestFacts(input.hint ?? {})
    const now = new Date()
    let deviceId = facts.deviceId
    let newDevice = true

    if (deviceId) {
      const known = await prisma.adminDevice.findUnique({
        where: { userId_deviceId: { userId: input.userId, deviceId } },
      })
      if (known && !known.forgottenAt) {
        newDevice = false
        await prisma.adminDevice.update({
          where: { id: known.id },
          data: { lastSeenAt: now, label: facts.device },
        })
      } else if (known) {
        // Dimenticato: da oggi è di nuovo un dispositivo nuovo
        await prisma.adminDevice.update({
          where: { id: known.id },
          data: { forgottenAt: null, firstSeenAt: now, lastSeenAt: now, label: facts.device },
        })
      } else {
        await prisma.adminDevice.create({
          data: { userId: input.userId, deviceId, label: facts.device, firstSeenAt: now, lastSeenAt: now },
        })
      }
    } else {
      deviceId = newDeviceId()
      await prisma.adminDevice.create({
        data: { userId: input.userId, deviceId, label: facts.device, firstSeenAt: now, lastSeenAt: now },
      })
    }
    // Sempre, anche se c'era già: rinnova l'anno di vita
    await setDeviceCookie(deviceId)

    await prisma.adminLogin.create({
      data: {
        userId: input.userId,
        outcome: "OK",
        ip: facts.ip,
        country: facts.country,
        device: facts.device,
        deviceId,
        newDevice,
        sessionId: input.sessionId,
      },
    })

    const anomalies = loginAnomalies({ newDevice, country: facts.country })
    if (anomalies.length > 0) {
      after(() =>
        sendSecurityNotice({
          kind: "login",
          userId: input.userId,
          anomalies,
          at: now,
          country: facts.country,
          device: facts.device,
        }),
      )
    }
  } catch (error) {
    logError("[admin-logins] record success", error)
  }
}

export type PreviousLogin = { at: Date; device: string; country: string | null }

// L'ultimo accesso riuscito PRIMA di questa sessione: quello che un admin
// deve riconoscere come suo
export async function previousSuccessfulLogin(
  userId: string,
  currentSessionId: string | null,
): Promise<PreviousLogin | null> {
  const row = await prisma.adminLogin.findFirst({
    where: {
      userId,
      outcome: "OK",
      ...(currentSessionId ? { NOT: { sessionId: currentSessionId } } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true, device: true, country: true },
  })
  return row ? { at: row.createdAt, device: row.device, country: row.country } : null
}

export type AdminLoginRow = {
  id: string
  at: Date
  outcome: AdminLoginOutcome
  device: string
  country: string | null
  newDevice: boolean
}

export async function listAdminLogins(userId: string, now: Date = new Date()): Promise<AdminLoginRow[]> {
  const rows = await prisma.adminLogin.findMany({
    where: { userId, createdAt: { gte: adminLoginCutoff(now) } },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: { id: true, createdAt: true, outcome: true, device: true, country: true, newDevice: true },
  })
  return rows.map((r) => ({
    id: r.id,
    at: r.createdAt,
    outcome: r.outcome,
    device: r.device,
    country: r.country,
    newDevice: r.newDevice,
  }))
}

export type KnownDevice = {
  id: string
  deviceId: string
  label: string
  firstSeenAt: Date
  lastSeenAt: Date
}

export async function listKnownDevices(userId: string): Promise<KnownDevice[]> {
  return prisma.adminDevice.findMany({
    where: { userId, forgottenAt: null },
    orderBy: { lastSeenAt: "desc" },
    select: { id: true, deviceId: true, label: true, firstSeenAt: true, lastSeenAt: true },
  })
}

// «Dimentica»: il dispositivo torna nuovo al prossimo accesso
export async function forgetKnownDevice(userId: string, id: string): Promise<boolean> {
  const result = await prisma.adminDevice.updateMany({
    where: { id, userId, forgottenAt: null },
    data: { forgottenAt: new Date() },
  })
  return result.count > 0
}

// Il cron notturno: via lo storico oltre i 90 giorni e i dispositivi che
// non si vedono (o sono dimenticati) da altrettanto
export async function purgeOldAdminLogins(
  now: Date = new Date(),
): Promise<{ logins: number; devices: number }> {
  const cutoff = adminLoginCutoff(now)
  const [logins, devices] = await prisma.$transaction([
    prisma.adminLogin.deleteMany({ where: { createdAt: { lt: cutoff } } }),
    prisma.adminDevice.deleteMany({
      where: { OR: [{ lastSeenAt: { lt: cutoff } }, { forgottenAt: { lt: cutoff } }] },
    }),
  ])
  return { logins: logins.count, devices: devices.count }
}
