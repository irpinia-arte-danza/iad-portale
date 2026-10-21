import { readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

// Ogni modulo che spedisce un file a una server action passa da
// callUploadAction: se la action si rompe (413, rete, timeout) il modulo
// esce dall'attesa e mostra il motivo. Il bug di ottobre 2026 era un
// `await createMedicalCertificate(...)` nudo: la promessa rotta lasciava la
// rotella accesa. Qui si controlla il sorgente, come per la preparazione
// della foto (src/lib/consents/file-prepare.test.ts).
const SITES: Array<[file: string, action: string]> = [
  ["src/app/(admin)/admin/athletes/[id]/_components/medical-cert-form-dialog.tsx", "createMedicalCertificate"],
  ["src/app/(admin)/admin/athletes/[id]/_components/medical-cert-form-dialog.tsx", "updateMedicalCertificate"],
  ["src/app/(admin)/admin/athletes/_components/athlete-form.tsx", "createMedicalCertificate"],
  ["src/app/(admin)/admin/athletes/[id]/_components/consent-form-dialog.tsx", "registerConsents"],
  ["src/app/(admin)/admin/athletes/[id]/_components/consent-attach-dialog.tsx", "attachConsentFile"],
  ["src/app/(admin)/admin/athletes/[id]/_components/endas-card-section.tsx", "importCardFile"],
  ["src/app/(admin)/admin/tessere/_components/card-import.tsx", "importCardFile"],
  ["src/app/(admin)/admin/tessere/_components/card-import.tsx", "previewCardImport"],
  ["src/app/(admin)/admin/settings/_components/logo-slot-upload.tsx", "uploadLogo"],
]

function source(file: string): string {
  return readFileSync(path.join(process.cwd(), file), "utf8")
}

describe("caricamenti dentro callUploadAction", () => {
  it.each(SITES)("%s → %s", (file, action) => {
    const code = source(file)
    expect(code).toContain('from "@/lib/uploads/upload-call"')
    // Nessuna chiamata nuda: `await action(` senza callUploadAction davanti
    expect(code).not.toMatch(new RegExp(`await ${action}\\(`))
    expect(code).toContain("callUploadAction")
  })

  it("le foto si riducono anche nella nuova allieva", () => {
    expect(
      source("src/app/(admin)/admin/athletes/_components/new-athlete-certificate-fields.tsx"),
    ).toContain("await prepareCertificateFile(picked)")
  })

  it("next.config alza il corpo delle server action a 5 MB", () => {
    expect(source("next.config.ts")).toMatch(/bodySizeLimit:\s*"5mb"/)
  })
})
