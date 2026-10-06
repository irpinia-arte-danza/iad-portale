import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"

import ts from "typescript"
import { describe, expect, it } from "vitest"

// ─────────────────────────────────────────────────────────────────────────
// Ogni query dell'area admin controlla il ruolo da sé, come prima cosa.
//
// Il proxy verifica che ci sia una sessione, non che sia di un admin; il
// layout di (admin) chiama requireAdmin, ma un layout non si riesegue a ogni
// navigazione client e non è il posto dove mettere l'autorizzazione. Quindi
// la regola è: ogni funzione esportata async di un file queries.ts sotto
// app/(admin) inizia con `await requireAdmin()`. Questo test la fa
// rispettare anche alla prossima pagina nuova: se una query nasce senza
// guardia, o la guardia arriva dopo una lettura, il test lo dice per nome.
// ─────────────────────────────────────────────────────────────────────────

const ADMIN_DIR = path.resolve(__dirname)

function queryFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter(
      (entry) =>
        entry.isFile() &&
        /queries\.ts$/.test(entry.name) &&
        !entry.name.endsWith(".test.ts"),
    )
    .map((entry) => path.join(entry.parentPath, entry.name))
}

const GUARD_FIRST = /^(?:const\s+(?:\{[^}]*\}|\w+)\s*=\s*)?await requireAdmin\(\)/

function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
  return (
    ts.canHaveModifiers(node) &&
    (ts.getModifiers(node) ?? []).some((m) => m.kind === kind)
  )
}

type Exported = { name: string; body: ts.Block }

// Le funzioni esportate async di un file: `export async function x()` e
// `export const x = cache(async () => {…})` (le query con cache di React)
function exportedAsyncFunctions(sf: ts.SourceFile): Exported[] {
  const out: Exported[] = []
  for (const st of sf.statements) {
    if (
      ts.isFunctionDeclaration(st) &&
      hasModifier(st, ts.SyntaxKind.ExportKeyword) &&
      hasModifier(st, ts.SyntaxKind.AsyncKeyword) &&
      st.body &&
      st.name
    ) {
      out.push({ name: st.name.text, body: st.body })
    }
    if (ts.isVariableStatement(st) && hasModifier(st, ts.SyntaxKind.ExportKeyword)) {
      for (const decl of st.declarationList.declarations) {
        let init = decl.initializer
        if (
          init &&
          ts.isCallExpression(init) &&
          init.arguments[0] &&
          (ts.isArrowFunction(init.arguments[0]) ||
            ts.isFunctionExpression(init.arguments[0]))
        ) {
          init = init.arguments[0]
        }
        if (
          init &&
          (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) &&
          hasModifier(init, ts.SyntaxKind.AsyncKeyword) &&
          ts.isBlock(init.body)
        ) {
          out.push({ name: decl.name.getText(sf), body: init.body })
        }
      }
    }
  }
  return out
}

describe("query dell'area admin", () => {
  const files = queryFiles(ADMIN_DIR)

  it("ci sono file da controllare", () => {
    expect(files.length).toBeGreaterThan(15)
  })

  it("ogni funzione esportata async inizia con await requireAdmin()", () => {
    const offenders: string[] = []
    let checked = 0
    for (const file of files) {
      const sf = ts.createSourceFile(
        file,
        readFileSync(file, "utf8"),
        ts.ScriptTarget.Latest,
        true,
      )
      for (const fn of exportedAsyncFunctions(sf)) {
        checked += 1
        const first = fn.body.statements[0]
        if (!first || !GUARD_FIRST.test(first.getText(sf).trim())) {
          offenders.push(`${path.relative(ADMIN_DIR, file)} → ${fn.name}`)
        }
      }
    }
    expect(checked).toBeGreaterThan(50)
    expect(offenders, offenders.join("\n")).toEqual([])
  })
})
