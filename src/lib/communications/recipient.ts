// ─────────────────────────────────────────────────────────────────────────
// A chi scrive il gestionale per un'allieva.
//
// Fino a ieri la risposta era sempre "al primo genitore collegato", e le
// allieve del corso adulti — maggiorenni, senza genitori, che pagano per sé —
// non ricevevano nulla: né inviti stage, né promemoria certificato, né
// solleciti. Non un errore visibile, semplicemente saltate.
//
// Regola: se c'è un genitore collegato si scrive a lui, come prima. Solo
// quando NON ci sono genitori collegati si scrive all'allieva, se è
// maggiorenne e ha un'email propria.
//
// Due limiti, e nessuno dei due è pignoleria:
// - il ripiego non scatta mai quando un genitore esiste ma è senza email. Un
//   genitore senza email è un'anagrafica da completare, non un motivo per
//   scrivere alla figlia;
// - il ripiego non scatta mai su una minorenne. Le comunicazioni della scuola
//   vanno a un adulto: una minorenne senza genitori raggiungibili è
//   un'anagrafica incompleta, non una destinataria.
// ─────────────────────────────────────────────────────────────────────────

import { isMinorAt } from "@/lib/utils/age"

export type RecipientParent = {
  id: string
  firstName: string
  lastName: string
  email: string | null
  receivesEmailCommunications?: boolean
}

export type RecipientAthlete = {
  firstName: string
  lastName: string
  email?: string | null
  // Obbligatoria di proposito: decide se l'allieva può ricevere per sé, e
  // volerla nel tipo costringe ogni query a selezionarla invece di lasciare
  // che il controllo salti in silenzio
  dateOfBirth: Date
  parentRelations: { parent: RecipientParent }[]
}

export type CommunicationRecipient = {
  email: string
  name: string
  // null quando la destinataria è l'allieva stessa
  parentId: string | null
  isAthlete: boolean
}

export type RecipientRefusalReason =
  | "NO_EMAIL"
  | "OPTED_OUT"
  | "NO_CONTACT"
  | "MINOR_NO_PARENT"

export type RecipientResolution =
  | { ok: true; recipient: CommunicationRecipient }
  | { ok: false; reason: RecipientRefusalReason; message: string }

function fullName(p: { firstName: string; lastName: string }): string {
  return `${p.firstName} ${p.lastName}`.trim()
}

function cleaned(email: string | null | undefined): string | null {
  const value = email?.trim()
  return value && value.length > 0 ? value : null
}

export function resolveCommunicationRecipient(
  athlete: RecipientAthlete,
  options?: {
    // Gli inviti e i promemoria rispettano l'interruttore del genitore; i
    // solleciti di pagamento no, ed è una scelta che resta dov'era
    requireCommunicationsConsent?: boolean
    // Data di riferimento per la maggiore età (i test la passano)
    at?: Date
  },
): RecipientResolution {
  const parent = athlete.parentRelations[0]?.parent ?? null

  if (parent) {
    const email = cleaned(parent.email)
    if (!email) {
      return { ok: false, reason: "NO_EMAIL", message: "Genitore senza email" }
    }
    if (
      options?.requireCommunicationsConsent &&
      parent.receivesEmailCommunications === false
    ) {
      return {
        ok: false,
        reason: "OPTED_OUT",
        message: "Il genitore ha disattivato le comunicazioni email",
      }
    }
    return {
      ok: true,
      recipient: {
        email,
        name: fullName(parent),
        parentId: parent.id,
        isAthlete: false,
      },
    }
  }

  // Nessun genitore collegato: può ricevere l'allieva, ma solo se maggiorenne
  if (isMinorAt(athlete.dateOfBirth, options?.at ?? new Date())) {
    return {
      ok: false,
      reason: "MINOR_NO_PARENT",
      message:
        "Allieva minorenne senza genitori collegati: collega un genitore per poterle scrivere",
    }
  }

  const own = cleaned(athlete.email)
  if (!own) {
    return {
      ok: false,
      reason: "NO_CONTACT",
      message: "Nessun genitore collegato e allieva senza email",
    }
  }
  return {
    ok: true,
    recipient: {
      email: own,
      name: fullName(athlete),
      parentId: null,
      isAthlete: true,
    },
  }
}
