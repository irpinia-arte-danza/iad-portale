import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"

import ts from "typescript"
import { describe, expect, it } from "vitest"

// Nessun `console.error(…, error)` con l'oggetto intero nel codice: si passa
// da logError, che tiene codice e campi e lascia fuori i dati. Il test
// percorre il sorgente con il parser TypeScript e segnala ogni chiamata a
// console.error / console.warn che passa un errore catturato come argomento
// (identificatore `error`, `err`, `…Error`, oppure `{ …, error }`).
const SRC = path.resolve(__dirname, "../..")
const ERROR_IDENT = /^(error|err|e|\w+Error|\w+Err)$/

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && /\.tsx?$/.test(entry.name))
    .filter((entry) => !/\.test\.tsx?$/.test(entry.name))
    .map((entry) => path.join(entry.parentPath, entry.name))
}

function passesErrorObject(arg: ts.Expression): boolean {
  if (ts.isIdentifier(arg)) return ERROR_IDENT.test(arg.text)
  if (ts.isObjectLiteralExpression(arg)) {
    return arg.properties.some(
      (p) =>
        (ts.isShorthandPropertyAssignment(p) && ERROR_IDENT.test(p.name.text)) ||
        (ts.isPropertyAssignment(p) &&
          ts.isIdentifier(p.initializer) &&
          ERROR_IDENT.test(p.initializer.text)),
    )
  }
  return false
}

function rawConsoleCalls(sf: ts.SourceFile): number[] {
  const lines: number[] = []
  const visit = (node: ts.Node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === "console" &&
      (node.expression.name.text === "error" || node.expression.name.text === "warn") &&
      node.arguments.some(passesErrorObject)
    ) {
      lines.push(sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1)
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return lines
}

describe("log degli errori", () => {
  it("nessun console.error con l'oggetto errore intero", () => {
    const offenders: string[] = []
    for (const file of sourceFiles(SRC)) {
      if (file.endsWith(path.join("lib", "logging", "log-error.ts"))) continue
      const sf = ts.createSourceFile(
        file,
        readFileSync(file, "utf8"),
        ts.ScriptTarget.Latest,
        true,
        file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
      )
      for (const line of rawConsoleCalls(sf)) {
        offenders.push(`${path.relative(SRC, file)}:${line}`)
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([])
  })
})
