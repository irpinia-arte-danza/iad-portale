// Composizione dei dati anagrafici che finiscono congelati sulla ricevuta.
// Funzioni pure: le usa l'emissione, le usano i test. Restituiscono null
// quando il dato non c'è, così chi stampa sa che la riga non va messa.

export type PersonAddressFields = {
  residenceStreet: string | null
  residenceNumber: string | null
  residenceCap: string | null
  residenceCity: string | null
  residenceProvince: string | null
}

// "Via Roma 1 — 83048 Montella (AV)"
export function composeAddress(p: PersonAddressFields): string | null {
  const street = [p.residenceStreet, p.residenceNumber]
    .filter(Boolean)
    .join(" ")
    .trim()
  const place = [
    p.residenceCap,
    p.residenceCity,
    p.residenceProvince ? `(${p.residenceProvince})` : null,
  ]
    .filter(Boolean)
    .join(" ")
    .trim()
  const full = [street, place].filter((s) => s.length > 0).join(" — ")
  return full.length > 0 ? full : null
}
