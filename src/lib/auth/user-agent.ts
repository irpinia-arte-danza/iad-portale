// ─────────────────────────────────────────────────────────────────────────
// Lo user agent ridotto a quello che un admin riconosce: «Safari su iPad»,
// «Chrome su Mac». Niente dipendenze, niente versione, niente stringa
// intera salvata: basta capire da che cosa si è entrati.
//
// iPadOS si presenta come un Mac (Apple nasconde l'iPad dallo user agent dal
// 2019): la differenza la fa solo il browser, che sa se lo schermo è touch.
// Il modulo di accesso manda quell'indizio (touchMac) e qui lo si usa.
// ─────────────────────────────────────────────────────────────────────────

export const UNKNOWN_DEVICE_LABEL = "Dispositivo sconosciuto"

export type DeviceHint = {
  // navigator.maxTouchPoints > 1 su una piattaforma Mac: è un iPad
  touchMac?: boolean
}

type Parsed = { browser: string | null; device: string | null }

export function parseUserAgent(ua: string | null | undefined, hint: DeviceHint = {}): Parsed {
  const s = ua ?? ""
  let browser: string | null = null
  if (/\bEdg(?:e|A|iOS)?\//.test(s)) browser = "Edge"
  else if (/\bOPR\/|\bOpera\b/.test(s)) browser = "Opera"
  else if (/\bFirefox\/|\bFxiOS\//.test(s)) browser = "Firefox"
  else if (/\bChrome\/|\bCriOS\/|\bChromium\//.test(s)) browser = "Chrome"
  else if (/\bSafari\//.test(s) && /\bVersion\//.test(s)) browser = "Safari"

  let device: string | null = null
  if (/\biPad\b/.test(s)) device = "iPad"
  else if (/\biPhone\b/.test(s)) device = "iPhone"
  else if (/\bAndroid\b/.test(s)) device = "Android"
  else if (/\bMacintosh\b|\bMac OS X\b/.test(s)) device = hint.touchMac ? "iPad" : "Mac"
  else if (/\bWindows\b/.test(s)) device = "Windows"
  else if (/\bCrOS\b/.test(s)) device = "Chromebook"
  else if (/\bLinux\b|\bX11\b/.test(s)) device = "Linux"

  return { browser, device }
}

export function describeUserAgent(ua: string | null | undefined, hint: DeviceHint = {}): string {
  const { browser, device } = parseUserAgent(ua, hint)
  if (browser && device) return `${browser} su ${device}`
  if (browser) return browser
  if (device) return device
  return UNKNOWN_DEVICE_LABEL
}
