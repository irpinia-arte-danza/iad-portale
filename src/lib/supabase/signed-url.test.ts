import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import { SIGNED_URL_TTL_SECONDS } from "./signed-url"

const SRC = path.resolve(__dirname, "../..")

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && /\.tsx?$/.test(entry.name))
    .filter((entry) => !entry.name.endsWith(".test.ts"))
    .map((entry) => path.join(entry.parentPath, entry.name))
}

describe("link firmati", () => {
  it("vivono cinque minuti", () => {
    expect(SIGNED_URL_TTL_SECONDS).toBe(300)
  })

  // Ogni createSignedUrl del codice passa la costante condivisa: un TTL
  // scritto a mano in un bucket nuovo farebbe fallire questo test, non il
  // controllo di una PR.
  it("ogni createSignedUrl usa la costante condivisa", () => {
    const calls: { file: string; ttl: string }[] = []
    for (const file of sourceFiles(SRC)) {
      const source = readFileSync(file, "utf8")
      for (const match of source.matchAll(
        /\.createSignedUrl\(\s*[^,()]+,\s*([^,()]+?)\s*[,)]/g,
      )) {
        calls.push({ file: path.relative(SRC, file), ttl: match[1].trim() })
      }
    }
    expect(calls.length).toBeGreaterThan(0)
    for (const call of calls) {
      expect(call, call.file).toMatchObject({ ttl: "SIGNED_URL_TTL_SECONDS" })
    }
  })

  it("la costante è definita in un posto solo", () => {
    const definitions = sourceFiles(SRC).filter((file) =>
      /SIGNED_URL_TTL_SECONDS\s*=/.test(readFileSync(file, "utf8")),
    )
    expect(definitions.map((f) => path.relative(SRC, f))).toEqual([
      "lib/supabase/signed-url.ts",
    ])
  })
})
