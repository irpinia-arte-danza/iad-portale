import * as XLSX from "xlsx"

export interface XlsxSheet {
  name: string
  headers: string[]
  rows: unknown[][]
  columnWidths?: number[]
}

// Un valore che inizia con = + - @ (o tab/a capo) in un foglio Excel è una
// formula: un nome scritto così nell'anagrafica verrebbe eseguito dal foglio
// del commercialista. L'apostrofo davanti lo rende testo e Excel non lo
// mostra. Numeri e date non si toccano.
const FORMULA_START = /^[=+\-@\t\r]/

export function sanitizeCell(value: unknown): unknown {
  if (typeof value === "string" && FORMULA_START.test(value)) return `'${value}`
  return value
}

function buildWorkbook(sheets: XlsxSheet[]): XLSX.WorkBook {
  const wb = XLSX.utils.book_new()

  for (const sheet of sheets) {
    const data: unknown[][] = [
      sheet.headers.map(sanitizeCell),
      ...sheet.rows.map((row) => row.map(sanitizeCell)),
    ]
    const ws = XLSX.utils.aoa_to_sheet(data)

    const widths = sheet.columnWidths ?? sheet.headers.map(() => 20)
    ws["!cols"] = widths.map((wch) => ({ wch }))

    const safeName = sheet.name.slice(0, 31)
    XLSX.utils.book_append_sheet(wb, ws, safeName)
  }

  return wb
}

export function buildXlsxBuffer(sheets: XlsxSheet[]): Buffer {
  const wb = buildWorkbook(sheets)
  const out = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer
  return out
}

export function generateXLSX(sheets: XlsxSheet[], filename: string): void {
  const wb = buildWorkbook(sheets)
  XLSX.writeFile(wb, filename)
}
