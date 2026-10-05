import { isMinorAt } from "@/lib/utils/age"
import { todayDateOnly } from "@/lib/utils/date-only"

// ─────────────────────────────────────────────────────────────────────────
// La sezione "Genitori e tutori" della scheda allieva, in base all'età.
//
// Finora diceva la stessa cosa a tutte: "Nessun genitore collegato — collega
// almeno un genitore o tutore", con il tasto in evidenza. Per una maggiorenne
// del corso adulti è un'indicazione sbagliata: le comunicazioni e le ricevute
// possono andare a lei (resolveCommunicationRecipient, resolvePayer) e può
// avere un accesso proprio al portale (athleteAccessEligibility). Il form di
// creazione, il blocco "Da completare" e le comunicazioni decidono già in
// base alla data di nascita; questa sezione no.
//
// Funzione pura: la maggiore età con isMinorAt e il giorno di Roma, come il
// resto del portale, così chi compie 18 anni oggi è già maggiorenne.
// ─────────────────────────────────────────────────────────────────────────

export type GuardianSectionKind =
  | "MINOR"
  | "ADULT_NO_GUARDIAN"
  | "ADULT_WITH_GUARDIAN"

export type GuardianSectionEmpty =
  // Invito in evidenza: manca qualcosa che serve davvero (minorenne)
  | { style: "call-to-action"; title: string; hint: string }
  // Solo una riga: non manca niente, si spiega com'è (maggiorenne)
  | { style: "note"; text: string }

export type GuardianSection = {
  kind: GuardianSectionKind
  // Stato vuoto, null quando c'è almeno un genitore collegato
  empty: GuardianSectionEmpty | null
  // A chi vanno comunicazioni e ricevute, sotto l'elenco
  recipientNote: string | null
  // Solo per chi ha già un account suo: cosa ne è adesso
  ownAccessNote: string | null
  addButton: { label: string; variant: "default" | "outline" }
  // Da mostrare nel dialog prima di confermare il collegamento: null quando
  // collegare un genitore non cambia nulla per lei
  accessWarning: string | null
}

// La regola vera, ricavata dal codice che invia e che emette:
// - resolveCommunicationRecipient scrive al primo genitore collegato e
//   ripiega sull'allieva solo se di genitori non ce n'è nessuno;
// - l'ordine del "primo" dipende da chi scrive: solleciti e inviti partono
//   da chi paga i contributi, i promemoria del certificato dal contatto
//   principale;
// - resolvePayer intesta la ricevuta al genitore indicato sul pagamento,
//   altrimenti al pagante, altrimenti al contatto, e solo senza genitori
//   all'allieva.
const RECIPIENT_NOTE_ADULT =
  "Comunicazioni e ricevute vanno al genitore collegato, non a lei: solleciti e inviti a chi paga i contributi, promemoria del certificato al contatto principale. Sulla ricevuta il pagante è il genitore, tranne quando sul pagamento è indicato qualcun altro."

const ADULT_NO_GUARDIAN_NOTE =
  "È maggiorenne: comunicazioni e ricevute vanno a lei. Collega un genitore solo se è lui o lei a pagare."

// L'accesso proprio non si rompe — resolveAccountState guarda solo che
// l'utente sia attivo e che l'allieva non sia nel Cestino — ma smette di
// essere gestibile: athleteAccessEligibility lo consente solo a zero
// genitori collegati, quindi la sezione dell'accesso sparisce dalla scheda e
// il motore dell'invito rifiuta un nuovo link.
const OWN_ACCESS_WARNING =
  "L'allieva ha un accesso proprio all'area riservata. Collegando un genitore il suo accesso continua a funzionare ed entrando vede solo i suoi dati, ma comunicazioni e ricevute passano al genitore e da questa scheda l'accesso non si potrà più gestire: per reinviarle il link bisognerà prima scollegare il genitore. Lei può comunque recuperare la password da sola."

const OWN_ACCESS_NOTE =
  "Ha un accesso proprio all'area riservata: continua a funzionare e le mostra solo i suoi dati, ma da qui non si può più gestire — per reinviarle il link di accesso va prima scollegato il genitore."

export function guardianSection(params: {
  dateOfBirth: Date
  // Genitori collegati e non nel cestino
  linkedParents: number
  // Ha già un account proprio sul portale (invitata o attiva)
  hasOwnAccess?: boolean
  at?: Date
}): GuardianSection {
  const { dateOfBirth, linkedParents, hasOwnAccess = false } = params
  const at = params.at ?? todayDateOnly()

  if (isMinorAt(dateOfBirth, at)) {
    // Identica a prima: per una minorenne il genitore serve davvero, senza
    // di lui non parte nessuna comunicazione e non si emette una ricevuta
    return {
      kind: "MINOR",
      empty:
        linkedParents === 0
          ? {
              style: "call-to-action",
              title: "Nessun genitore collegato",
              hint: "Collega almeno un genitore o tutore per gestire contatti e pagamenti.",
            }
          : null,
      recipientNote: null,
      ownAccessNote: null,
      addButton: { label: "Collega genitore", variant: "default" },
      accessWarning: null,
    }
  }

  if (linkedParents === 0) {
    return {
      kind: "ADULT_NO_GUARDIAN",
      empty: { style: "note", text: ADULT_NO_GUARDIAN_NOTE },
      recipientNote: null,
      ownAccessNote: null,
      addButton: { label: "Collega un genitore", variant: "outline" },
      accessWarning: hasOwnAccess ? OWN_ACCESS_WARNING : null,
    }
  }

  return {
    kind: "ADULT_WITH_GUARDIAN",
    empty: null,
    recipientNote: RECIPIENT_NOTE_ADULT,
    ownAccessNote: hasOwnAccess ? OWN_ACCESS_NOTE : null,
    addButton: { label: "Collega un genitore", variant: "outline" },
    accessWarning: null,
  }
}
