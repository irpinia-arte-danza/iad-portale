// ─────────────────────────────────────────────────────────────────────────
// La causale del bonifico, composta dal portale.
//
// Giuseppina riconosce un bonifico dalla causale: mese e nome dell'allieva.
// Se la famiglia la scrive a modo suo («rata danza», «ottobre»), poi tocca
// cercare. Qui la causale è una e si copia con un tasto:
//   «Contributo ottobre 2026 · Mia Rossi»
//   «Contributi ottobre e novembre 2026 · Mia Rossi»
//   «Contributi dicembre 2026 e gennaio 2027 · Mia Rossi»
//   «Contributo di iscrizione 2026/2027 · Mia Rossi»
// ─────────────────────────────────────────────────────────────────────────

export type PaymentReferenceItem =
  // Una rata mensile: conta il mese (la scadenza è il 10 del mese coperto)
  | { kind: "month"; month: Date }
  // Tutto il resto, già descritto (iscrizione, stage, saggio, costume)
  | { kind: "other"; label: string }

const MONTH_IT = new Intl.DateTimeFormat("it-IT", { month: "long", timeZone: "UTC" })

function joinIt(parts: string[]): string {
  if (parts.length <= 1) return parts.join("")
  return `${parts.slice(0, -1).join(", ")} e ${parts[parts.length - 1]}`
}

// «ottobre 2026», «ottobre e novembre 2026», «dicembre 2026 e gennaio 2027»
export function describeMonths(months: Date[]): string {
  const sorted = [...months]
    .map((m) => new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth(), 1)))
    .sort((a, b) => a.getTime() - b.getTime())
    .filter((m, i, arr) => i === 0 || m.getTime() !== arr[i - 1].getTime())
  const byYear = new Map<number, string[]>()
  for (const m of sorted) {
    const year = m.getUTCFullYear()
    byYear.set(year, [...(byYear.get(year) ?? []), MONTH_IT.format(m).toLowerCase()])
  }
  const groups = [...byYear.entries()].map(([year, names]) => `${joinIt(names)} ${year}`)
  return joinIt(groups)
}

export function buildPaymentReference(input: {
  athleteName: string
  items: PaymentReferenceItem[]
}): string {
  const months = input.items.flatMap((i) => (i.kind === "month" ? [i.month] : []))
  const others = input.items.flatMap((i) => (i.kind === "other" ? [i.label] : []))
  const parts: string[] = []
  if (months.length > 0) {
    // Lo stesso mese due volte (due corsi) è un mese solo: singolare
    const distinct = new Set(months.map((m) => `${m.getUTCFullYear()}-${m.getUTCMonth()}`)).size
    parts.push(`${distinct === 1 ? "Contributo" : "Contributi"} ${describeMonths(months)}`)
  }
  parts.push(...others)
  const what = parts.length > 0 ? parts.join(" + ") : "Contributo"
  return `${what} · ${input.athleteName.trim()}`
}
