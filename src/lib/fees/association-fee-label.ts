// Diciture del contributo di iscrizione annuale (tesseramento + assicurazione).
// Funzioni pure, senza "server-only": le usano anche i componenti client
// (elenco scadenze, scheda allieva) oltre a ricevute e portale genitori.
//
// La parola per la famiglia è "contributo", non "quota": è il termine corretto
// per una ASD. I nomi tecnici (feeType ASSOCIATION, colonne DB) restano quelli.

// "2026-2027" → "2026/2027"
export function academicYearSlashLabel(academicYearLabel: string): string {
  return academicYearLabel.replace("-", "/")
}

// "2026-2027" → "Contributo di iscrizione 2026/2027"
export function associationFeeDescription(academicYearLabel: string): string {
  return `Contributo di iscrizione ${academicYearSlashLabel(academicYearLabel)}`
}
