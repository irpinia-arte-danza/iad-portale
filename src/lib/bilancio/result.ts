// ─────────────────────────────────────────────────────────────────────────
// Il risultato del periodo, con il nome che ha in un'associazione.
//
// "Saldo netto" e "Margine %" sono parole da azienda: un'ASD non fa utili e
// non ha un margine. Quello che resta a fine periodo è l'avanzo di gestione,
// e se le uscite superano le entrate è un disavanzo. È anche la parola che
// usa il commercialista nel rendiconto.
//
// Con il disavanzo l'importo si scrive senza il segno meno: lo dice già la
// parola, e "Disavanzo di gestione -120,00 €" è una doppia negazione.
// ─────────────────────────────────────────────────────────────────────────

export type ManagementResult = {
  label: "Avanzo di gestione" | "Disavanzo di gestione"
  // Sempre positivo: il segno sta nell'etichetta
  amountCents: number
  isDeficit: boolean
}

export function managementResult(netCents: number): ManagementResult {
  // Il pareggio non è un disavanzo: zero resta dalla parte dell'avanzo
  if (netCents < 0) {
    return {
      label: "Disavanzo di gestione",
      amountCents: Math.abs(netCents),
      isDeficit: true,
    }
  }
  return { label: "Avanzo di gestione", amountCents: netCents, isDeficit: false }
}
