// Il messaggio del modulo di accesso a partire dall'errore di Supabase Auth.
//
// Credenziali errate e account mai attivato danno lo stesso messaggio: il
// secondo, da solo, direbbe a chiunque quali email sono state invitate
// (gli invitati che non hanno mai aperto il link restano "non confermati").
// Chi non ha mai aperto il link lo vede l'admin nella scheda del genitore
// («Invitato», «Reinvia accesso»), non il modulo di accesso.

export const INVALID_CREDENTIALS_MESSAGE = "Email o password non corretti"

export function loginErrorMessage(message: string): string {
  if (
    message.includes("Invalid login credentials") ||
    message.includes("Email not confirmed")
  ) {
    return INVALID_CREDENTIALS_MESSAGE
  }
  if (message.includes("Too many requests")) {
    return "Troppi tentativi, riprova tra qualche minuto"
  }
  return "Errore durante l'accesso, riprova"
}
