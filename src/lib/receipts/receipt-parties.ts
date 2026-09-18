// ─────────────────────────────────────────────────────────────────────────
// Pagante e allieva sulla ricevuta: quando sono la stessa persona il
// documento non ha nessun conto terzo, e i due riquadri mostrerebbero due
// volte lo stesso nome (è il caso delle allieve maggiorenni che pagano per
// sé, corso adulti).
//
// Il riconoscimento è un confronto sui dati già congelati sulla ricevuta:
// nessuna colonna nuova, e vale anche sulle ricevute emesse prima, perché è
// presentazione e non un dato da salvare.
// ─────────────────────────────────────────────────────────────────────────

export type ReceiptParties = {
  payerName: string
  payerFiscalCode: string | null
  athleteName: string
  athleteFiscalCode: string | null
}

function normalizedFiscalCode(value: string | null): string | null {
  const code = value?.trim().toUpperCase()
  return code && code.length > 0 ? code : null
}

function normalizedName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ")
}

export function isSelfIssued(parties: ReceiptParties): boolean {
  const payerCode = normalizedFiscalCode(parties.payerFiscalCode)
  const athleteCode = normalizedFiscalCode(parties.athleteFiscalCode)

  // Due codici fiscali: è la prova più forte che ci sia
  if (payerCode && athleteCode) return payerCode === athleteCode

  // Uno solo dei due: persone diverse. Se il pagante fosse l'allieva i due
  // campi verrebbero dalla stessa anagrafica e sarebbero entrambi pieni o
  // entrambi vuoti.
  if (payerCode || athleteCode) return false

  // Nessun codice fiscale (ricevuta in contanti a un pagante senza C.F.):
  // decide il nome. Due campi vuoti da soli non dicono nulla, e infatti qui
  // non vengono nemmeno confrontati.
  return (
    normalizedName(parties.payerName) === normalizedName(parties.athleteName)
  )
}
