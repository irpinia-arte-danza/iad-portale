// Regole su chi può essere intestatario di una ricevuta.
// L'età si calcola con isMinorAt (@/lib/utils/age), alla data di emissione:
// una ricevuta si valuta con i dati del giorno in cui nasce.

// Il messaggio dice cosa fare, non solo cosa non va: chi lo legge deve poter
// sistemare la situazione senza chiedere a nessuno.
export const MINOR_PAYER_BLOCKER =
  "La ricevuta risulterebbe intestata all'allieva, che è minorenne: non servirebbe a nessuno per il 730. Collega un genitore all'allieva, oppure indica il pagante sul pagamento."
