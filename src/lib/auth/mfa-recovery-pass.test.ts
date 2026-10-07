import { describe, expect, it } from "vitest"

import {
  recoveryPassKey,
  signRecoveryPass,
  verifyRecoveryPass,
} from "./mfa-recovery-pass"

const KEY = recoveryPassKey("segreto-di-prova")
const NOW = 1_800_000_000_000
const EXP = NOW + 60_000

describe("lasciapassare del codice di recupero", () => {
  it("vale per lo stesso utente e la stessa sessione, finché non scade", () => {
    const pass = signRecoveryPass(KEY, "user-1", "sess-1", EXP)
    expect(verifyRecoveryPass(KEY, pass, "user-1", "sess-1", NOW)).toBe(true)
  })

  it("non vale per un'altra sessione, un altro utente, o dopo la scadenza", () => {
    const pass = signRecoveryPass(KEY, "user-1", "sess-1", EXP)
    expect(verifyRecoveryPass(KEY, pass, "user-1", "sess-2", NOW)).toBe(false)
    expect(verifyRecoveryPass(KEY, pass, "user-2", "sess-1", NOW)).toBe(false)
    expect(verifyRecoveryPass(KEY, pass, "user-1", "sess-1", EXP + 1)).toBe(false)
    expect(verifyRecoveryPass(KEY, pass, "user-1", null, NOW)).toBe(false)
  })

  it("manomesso o firmato con un'altra chiave → no", () => {
    const pass = signRecoveryPass(KEY, "user-1", "sess-1", EXP)
    const [uid, sid, exp, sig] = pass.split(".")
    expect(verifyRecoveryPass(KEY, `${uid}.${sid}.${exp + "0"}.${sig}`, "user-1", "sess-1", NOW)).toBe(false)
    const other = signRecoveryPass(recoveryPassKey("altro"), "user-1", "sess-1", EXP)
    expect(verifyRecoveryPass(KEY, other, "user-1", "sess-1", NOW)).toBe(false)
    expect(verifyRecoveryPass(KEY, "spazzatura", "user-1", "sess-1", NOW)).toBe(false)
    expect(verifyRecoveryPass(KEY, undefined, "user-1", "sess-1", NOW)).toBe(false)
  })
})
