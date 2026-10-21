import { afterEach, describe, expect, it, vi } from "vitest"

import {
  callUploadAction,
  UPLOAD_NETWORK_MESSAGE,
  UPLOAD_SERVER_MESSAGE,
  UPLOAD_TIMEOUT_MESSAGE,
  UPLOAD_TIMEOUT_MS,
  UPLOAD_TOO_LARGE_MESSAGE,
  uploadFailureMessage,
} from "./upload-call"

afterEach(() => {
  vi.useRealTimers()
})

describe("callUploadAction", () => {
  it("passa l'esito della action così com'è", async () => {
    await expect(
      callUploadAction(async () => ({ ok: true, data: { id: "c1" } })),
    ).resolves.toEqual({ ok: true, data: { id: "c1" } })
    await expect(
      callUploadAction(async () => ({ ok: false, error: "Allieva non trovata" })),
    ).resolves.toEqual({ ok: false, error: "Allieva non trovata" })
  })

  // Il bug di produzione: la action rifiuta il corpo, il client di Next
  // rilancia, e il modulo restava in attesa per sempre
  it("un 413 della server action diventa un errore, non una promessa rotta", async () => {
    const result = await callUploadAction(() =>
      Promise.reject(
        new Error(
          "Body exceeded 1 MB limit.\nTo configure the body size limit for Server Actions, see: https://nextjs.org/docs/app/api-reference/next-config-js/serverActions#bodysizelimit",
        ),
      ),
    )
    expect(result).toEqual({ ok: false, error: UPLOAD_TOO_LARGE_MESSAGE })
  })

  it("una risposta 500 qualunque diventa un errore leggibile", async () => {
    const result = await callUploadAction(() =>
      Promise.reject(new Error("An unexpected response was received from the server.")),
    )
    expect(result).toEqual({ ok: false, error: UPLOAD_SERVER_MESSAGE })
  })

  it("la rete che cade su Safari («Load failed»)", async () => {
    const result = await callUploadAction(() =>
      Promise.reject(new TypeError("Load failed")),
    )
    expect(result).toEqual({ ok: false, error: UPLOAD_NETWORK_MESSAGE })
  })

  it("dopo 30 secondi smette di aspettare", async () => {
    vi.useFakeTimers()
    const pending = callUploadAction(() => new Promise<never>(() => {}))
    await vi.advanceTimersByTimeAsync(UPLOAD_TIMEOUT_MS - 1)
    let settled = false
    void pending.then(() => {
      settled = true
    })
    await Promise.resolve()
    expect(settled).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    await expect(pending).resolves.toEqual({
      ok: false,
      error: UPLOAD_TIMEOUT_MESSAGE,
    })
  })

  it("il timeout è di 30 secondi", () => {
    expect(UPLOAD_TIMEOUT_MS).toBe(30_000)
  })
})

describe("uploadFailureMessage", () => {
  it.each([
    ["Body exceeded 5mb limit.", UPLOAD_TOO_LARGE_MESSAGE],
    ["Request Entity Too Large", UPLOAD_TOO_LARGE_MESSAGE],
    ["413 FUNCTION_PAYLOAD_TOO_LARGE", UPLOAD_TOO_LARGE_MESSAGE],
    ["Failed to fetch", UPLOAD_NETWORK_MESSAGE],
    ["NetworkError when attempting to fetch resource.", UPLOAD_NETWORK_MESSAGE],
    ["qualcos'altro", UPLOAD_SERVER_MESSAGE],
  ])("%s", (message, expected) => {
    expect(uploadFailureMessage(new Error(message))).toBe(expected)
  })

  it("un TypeError che non viene dalla rete non dice «rete»", () => {
    expect(
      uploadFailureMessage(new TypeError("Cannot read properties of undefined")),
    ).toBe(UPLOAD_SERVER_MESSAGE)
  })
})
