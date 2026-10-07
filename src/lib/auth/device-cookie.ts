import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"

// ─────────────────────────────────────────────────────────────────────────
// Il cookie del dispositivo: «iad_device».
//
// Un id casuale, firmato come il lasciapassare della #54 (HMAC con chiave
// derivata dalla service role), un anno di vita, HttpOnly, SameSite=Lax.
// Non autentica nessuno: serve solo a riconoscere che l'accesso arriva dallo
// stesso browser dell'ultima volta. Senza cookie, o con un id che per
// quell'utente non si è mai visto, l'accesso è «da un dispositivo nuovo».
// ─────────────────────────────────────────────────────────────────────────

export const DEVICE_COOKIE = "iad_device"
export const DEVICE_COOKIE_DAYS = 365

const ID_PATTERN = /^[A-Za-z0-9_-]{16,64}$/

export function deviceKey(secret: string): Buffer {
  return createHmac("sha256", secret).update("iad-device").digest()
}

function sign(key: Buffer, id: string): string {
  return createHmac("sha256", key).update(id).digest("base64url")
}

export function newDeviceId(): string {
  return randomBytes(18).toString("base64url")
}

export function signDeviceId(key: Buffer, id: string): string {
  return `${id}.${sign(key, id)}`
}

// L'id del dispositivo se il cookie è integro e firmato con questa chiave,
// altrimenti null (cookie assente, manomesso o di un altro portale)
export function verifyDeviceCookie(key: Buffer, value: string | undefined | null): string | null {
  if (!value) return null
  const parts = value.split(".")
  if (parts.length !== 2) return null
  const [id, signature] = parts
  if (!ID_PATTERN.test(id)) return null
  const expected = Buffer.from(sign(key, id))
  const presented = Buffer.from(signature)
  if (expected.length !== presented.length || !timingSafeEqual(expected, presented)) return null
  return id
}
