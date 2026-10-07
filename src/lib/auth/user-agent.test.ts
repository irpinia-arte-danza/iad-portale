import { describe, expect, it } from "vitest"

import { describeUserAgent, UNKNOWN_DEVICE_LABEL } from "./user-agent"

const SAFARI_IPAD =
  "Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1"
const SAFARI_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1"
const CHROME_MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
const SAFARI_MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15"
const CHROME_ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"
const EDGE_WINDOWS =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0"

describe("describeUserAgent", () => {
  it("Safari su iPad e su iPhone", () => {
    expect(describeUserAgent(SAFARI_IPAD)).toBe("Safari su iPad")
    expect(describeUserAgent(SAFARI_IPHONE)).toBe("Safari su iPhone")
  })

  it("Chrome su Mac (Chrome contiene «Safari/» ma vince Chrome)", () => {
    expect(describeUserAgent(CHROME_MAC)).toBe("Chrome su Mac")
  })

  it("l'iPad di oggi si presenta come un Mac: con l'indizio touch torna iPad", () => {
    expect(describeUserAgent(SAFARI_MAC)).toBe("Safari su Mac")
    expect(describeUserAgent(SAFARI_MAC, { touchMac: true })).toBe("Safari su iPad")
    // L'indizio non trasforma un Windows in un iPad
    expect(describeUserAgent(EDGE_WINDOWS, { touchMac: true })).toBe("Edge su Windows")
  })

  it("Android ed Edge", () => {
    expect(describeUserAgent(CHROME_ANDROID)).toBe("Chrome su Android")
    expect(describeUserAgent(EDGE_WINDOWS)).toBe("Edge su Windows")
  })

  it("sconosciuto: vuoto, assente o un client qualsiasi", () => {
    expect(describeUserAgent("")).toBe(UNKNOWN_DEVICE_LABEL)
    expect(describeUserAgent(null)).toBe(UNKNOWN_DEVICE_LABEL)
    expect(describeUserAgent("curl/8.6.0")).toBe(UNKNOWN_DEVICE_LABEL)
  })
})
