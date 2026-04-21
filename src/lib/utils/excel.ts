import * as XLSX from "xlsx"

export interface XlsxSheet {
  name: string
  headers: string[]
  rows: unknown[][]
  columnWidths?: number[]
}

function buildWorkbook(sheets: XlsxSheet[]): XLSX.WorkBook {
  const wb = XLSX.utils.book_new()

  for (const sheet of sheets) {
    const data: unknown[][] = [sheet.headers, ...sheet.rows]
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
