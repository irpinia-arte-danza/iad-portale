// I nomi dei campi che una modifica cambia davvero. Si confrontano solo le
// chiavi presenti nel nuovo valore (quello che il modulo ha mandato); date
// per istante, tutto il resto per uguaglianza. I valori non escono da qui.
export function changedFields(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown>,
): string[] {
  const changed: string[] = []
  for (const [key, next] of Object.entries(after)) {
    if (next === undefined) continue
    const prev = before ? before[key] : undefined
    if (!sameValue(prev, next)) changed.push(key)
  }
  return changed.sort()
}

function sameValue(a: unknown, b: unknown): boolean {
  if (a instanceof Date || b instanceof Date) {
    const ta = a instanceof Date ? a.getTime() : a == null ? null : new Date(String(a)).getTime()
    const tb = b instanceof Date ? b.getTime() : b == null ? null : new Date(String(b)).getTime()
    return ta === tb
  }
  // "" e null sono lo stesso vuoto (cleanEmptyStrings)
  if ((a === null || a === "") && (b === null || b === "")) return true
  return a === b
}
