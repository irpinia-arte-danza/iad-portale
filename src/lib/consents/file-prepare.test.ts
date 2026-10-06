import { readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import { planForFile } from "@/lib/medical-certificates/photo-resize"

import { CONSENT_FILE_ALLOWED_MIME, CONSENT_FILE_MAX_BYTES } from "./file-rules"

// Il modulo firmato passa dalla stessa preparazione del certificato medico:
// non una copia, la stessa funzione.
describe("file del consenso", () => {
  it("il PDF passa intatto, la foto si riduce", () => {
    expect(planForFile({ type: "application/pdf", name: "modulo.pdf" })).toBe(
      "KEEP",
    )
    expect(planForFile({ type: "image/jpeg", name: "IMG_1.jpg" })).toBe("RESIZE")
    expect(planForFile({ type: "", name: "IMG_1.HEIC" })).toBe("RESIZE")
    expect(planForFile({ type: "text/plain", name: "a.txt" })).toBe("REJECT")
  })

  it("la scelta del file riusa prepareCertificateFile", () => {
    const dialog = readFileSync(
      path.resolve(
        __dirname,
        "../../app/(admin)/admin/athletes/[id]/_components/consent-file-picker.tsx",
      ),
      "utf8",
    )
    expect(dialog).toContain(
      'import { prepareCertificateFile } from "@/lib/medical-certificates/photo-resize"',
    )
    expect(dialog).toContain("await prepareCertificateFile(picked)")
  })

  it("stesse regole dei certificati: PDF, JPEG, PNG fino a 3 MB", () => {
    expect([...CONSENT_FILE_ALLOWED_MIME]).toEqual([
      "application/pdf",
      "image/jpeg",
      "image/png",
    ])
    expect(CONSENT_FILE_MAX_BYTES).toBe(3 * 1024 * 1024)
  })
})
