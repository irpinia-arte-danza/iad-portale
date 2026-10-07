import { describe, expect, it } from "vitest"

import { deviceKey, newDeviceId, signDeviceId, verifyDeviceCookie } from "./device-cookie"

const key = deviceKey("service-role-di-prova")
const otherKey = deviceKey("un-altro-segreto")

describe("cookie del dispositivo", () => {
  it("firma e rilegge lo stesso id", () => {
    const id = newDeviceId()
    expect(id).toMatch(/^[A-Za-z0-9_-]{16,64}$/)
    expect(verifyDeviceCookie(key, signDeviceId(key, id))).toBe(id)
  })

  it("firmato con un'altra chiave non vale", () => {
    const id = newDeviceId()
    expect(verifyDeviceCookie(otherKey, signDeviceId(key, id))).toBeNull()
  })

  it("manomesso, incompleto o assente non vale", () => {
    const id = newDeviceId()
    const good = signDeviceId(key, id)
    expect(verifyDeviceCookie(key, good.replace(id, newDeviceId()))).toBeNull()
    expect(verifyDeviceCookie(key, good.slice(0, -1))).toBeNull()
    expect(verifyDeviceCookie(key, id)).toBeNull()
    expect(verifyDeviceCookie(key, "")).toBeNull()
    expect(verifyDeviceCookie(key, undefined)).toBeNull()
    expect(verifyDeviceCookie(key, "a.b.c")).toBeNull()
  })

  it("due id nuovi sono diversi", () => {
    expect(newDeviceId()).not.toBe(newDeviceId())
  })
})
