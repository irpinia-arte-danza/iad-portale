// ─────────────────────────────────────────────────────────────────────────
// Incassare meno del dovuto allinea la scadenza: l'importo scende e la
// scadenza risulta pagata, senza residuo. È voluto (il mese di iscrizione o
// di ritiro si incassa a metà) ma è anche irreversibile senza passare da
// "Modifica importo", quindi prima di confermare va detto PER NOME su quale
// scadenza si sta applicando.
//
// Il caso che ha motivato questo codice: un incasso ridotto finito sulla
// mensile di ottobre invece che su settembre. Il form mostrava la frase
// giusta — "la scadenza passa da 40 a 20 € e risulta pagata" — ma senza dire
// QUALE scadenza, e con due mensili adiacenti quasi identiche nell'elenco la
// frase non poteva salvare nessuno.
// ─────────────────────────────────────────────────────────────────────────

export type CollectionRow = {
  id: string
  description: string
  // Quanto chiede la scadenza
  amountCents: number
  // Quanto si sta incassando su quella riga
  collectedCents: number
}

export type ReducedRow = {
  id: string
  description: string
  fromCents: number
  toCents: number
}

// Le righe su cui l'importo della scadenza verrebbe abbassato. Zero e importi
// oltre il dovuto non c'entrano: li rifiuta planCollection con il suo motivo.
export function reducedRows(rows: CollectionRow[]): ReducedRow[] {
  return rows
    .filter((r) => r.collectedCents > 0 && r.collectedCents < r.amountCents)
    .map((r) => ({
      id: r.id,
      description: r.description,
      fromCents: r.amountCents,
      toCents: r.collectedCents,
    }))
}

// Le righe su cui l'importo della scadenza verrebbe ALZATO: incassato più di
// quanto la scadenza chiedeva, ma non oltre la quota del corso. Non è un
// incasso ridotto, è una correzione — e si vede nella stessa operazione.
export function raisedRows(rows: CollectionRow[]): ReducedRow[] {
  return rows
    .filter((r) => r.collectedCents > r.amountCents)
    .map((r) => ({
      id: r.id,
      description: r.description,
      fromCents: r.amountCents,
      toCents: r.collectedCents,
    }))
}

const MESI_BREVI = [
  "GEN",
  "FEB",
  "MAR",
  "APR",
  "MAG",
  "GIU",
  "LUG",
  "AGO",
  "SET",
  "OTT",
  "NOV",
  "DIC",
] as const

// Sigla del mese per il contrassegno nell'elenco delle scadenze aperte.
// Scritta a mano e non con Intl: "SET" e "OTT" devono restare quelle anche se
// cambia la versione di ICU sotto Node, e un test le fissa.
export function monthBadge(dueDate: Date): string {
  return MESI_BREVI[new Date(dueDate).getUTCMonth()]
}

// Importo diverso da quello "di listino" su una scadenza ancora da incassare:
// è il segno che qualcosa è stato allineato e poi annullato. Le pagate non
// contano — lì l'importo È quanto è stato incassato.
export function isAmountOffReference(params: {
  amountCents: number
  referenceAmountCents: number | null
  isPaid: boolean
}): boolean {
  if (params.isPaid) return false
  if (params.referenceAmountCents === null) return false
  return params.amountCents !== params.referenceAmountCents
}
