function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return ""
  const str = String(value)
  if (/[";\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function generateCSV(
  headers: string[],
  rows: unknown[][],
  filename: string,
): void {
  const BOM = "\uFEFF"
  const body = [
    headers.map(escapeCell).join(";"),
    ...rows.map((row) => row.map(escapeCell).join(";")),
  ].join("\r\n")
  const csv = BOM + body

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
