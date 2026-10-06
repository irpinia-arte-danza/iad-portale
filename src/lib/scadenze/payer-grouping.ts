// ─────────────────────────────────────────────────────────────────────────
// Un'email per famiglia, non una per rata.
//
// Selezionando quattro rate di due famiglie partivano quattro email: due
// famiglie ne ricevevano due a testa, a mezzo secondo di distanza, ciascuna
// con una riga sola. Qui le rate si raggruppano per destinatario — il
// genitore collegato, o l'allieva stessa quando non ne ha (vedi
// resolveCommunicationRecipient) — e ogni famiglia riceve un messaggio con
// l'elenco delle rate.
//
// Funzione pura: chi chiama le passa le rate già risolte col destinatario.
// ─────────────────────────────────────────────────────────────────────────

export type PayerKeyed = {
  scheduleId: string
  // id del genitore, oppure null quando il destinatario è l'allieva stessa
  parentId: string | null
  athleteId: string
}

export type PayerGroup<T extends PayerKeyed> = {
  // Chiave stabile del destinatario: il genitore, o l'allieva se non ne ha
  key: string
  parentId: string | null
  items: T[]
}

export function payerKey(item: PayerKeyed): string {
  return item.parentId ? `parent:${item.parentId}` : `athlete:${item.athleteId}`
}

export function groupByPayer<T extends PayerKeyed>(items: T[]): PayerGroup<T>[] {
  const groups = new Map<string, PayerGroup<T>>()

  for (const item of items) {
    const key = payerKey(item)
    const existing = groups.get(key)
    if (existing) {
      existing.items.push(item)
      continue
    }
    groups.set(key, { key, parentId: item.parentId, items: [item] })
  }

  // L'ordine di arrivo è quello della query (scadenza crescente): si tiene
  return [...groups.values()]
}

export function countPayers(items: PayerKeyed[]): number {
  return new Set(items.map(payerKey)).size
}

// "4 scadenze · 2 famiglie"
export function selectionLabel(items: PayerKeyed[]): string {
  const scadenze = items.length === 1 ? "1 scadenza" : `${items.length} scadenze`
  const famiglie = countPayers(items)
  return `${scadenze} · ${famiglie === 1 ? "1 famiglia" : `${famiglie} famiglie`}`
}
