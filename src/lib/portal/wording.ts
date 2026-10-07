import type { PortalScope } from "@/lib/auth/portal-scope"

// ─────────────────────────────────────────────────────────────────────────
// Le parole dell'area riservata cambiano con chi la sta guardando: un
// genitore iscrive le figlie, un'allieva maggiorenne iscrive sé stessa.
//
// Stanno tutte qui invece che sparse in mezzo al markup: così si leggono
// insieme, e un test può verificare che a un'allieva non si dia mai della
// madre di qualcuno.
// ─────────────────────────────────────────────────────────────────────────

export type PortalWording = {
  greetingFallback: string
  peopleSectionTitle: string
  peopleSectionEmpty: string
  stagesCardHint: string
  stagesPageIntro: string
  stageEnrollButton: string
  stageSelectHint: string
  stageSelectNone: string
  scheduleCardTitle: string
  scheduleCardEmpty: string
  // Stato vuoto delle ricevute: cosa comparirà
  receiptsEmptyDescription: string
  // Riquadro di una figlia maggiorenne nella dashboard del genitore; {nome}
  // è il segnaposto del nome. Per l'allieva stessa non compare mai: il
  // testo lo ripete solo per non lasciare una stringa vuota.
  adultDaughterNote: string
}

export function portalWording(scope: PortalScope): PortalWording {
  if (scope.kind === "athlete") {
    return {
      greetingFallback: "",
      peopleSectionTitle: "La mia iscrizione",
      peopleSectionEmpty:
        "Nessuna iscrizione attiva. Contatta la segreteria per assistenza.",
      stagesCardHint: "Tocca per vedere e iscriverti.",
      stagesPageIntro:
        "Eventi occasionali aperti all'iscrizione. Iscriviti e ricevi la scadenza di pagamento in dashboard.",
      stageEnrollButton: "Iscrivimi",
      stageSelectHint:
        "Verrà creata una scadenza di pagamento da saldare in segreteria.",
      stageSelectNone: "Iscrizione non disponibile",
      scheduleCardTitle: "I miei corsi",
      scheduleCardEmpty: "Nessun orario disponibile per i tuoi corsi.",
      receiptsEmptyDescription:
        "Quando la segreteria registra un tuo pagamento, la ricevuta compare qui e si scarica in PDF.",
      adultDaughterNote:
        "Certificato, tessera e presenze sono qui sotto, insieme alle rate e alle ricevute.",
    }
  }

  return {
    greetingFallback: "Genitore",
    peopleSectionTitle: "Le mie figlie",
    peopleSectionEmpty:
      "Nessuna allieva associata al tuo account. Contatta la segreteria per assistenza.",
    stagesCardHint: "Tocca per vedere e iscrivere le tue figlie.",
    stagesPageIntro:
      "Eventi occasionali aperti all'iscrizione. Iscrivi le tue figlie e ricevi la scadenza di pagamento in dashboard.",
    stageEnrollButton: "Iscrivi le mie figlie",
    stageSelectHint:
      "Seleziona le figlie da iscrivere. Verrà creata una scadenza di pagamento da saldare in segreteria.",
    stageSelectNone: "Seleziona almeno un'allieva",
    scheduleCardTitle: "Le mie figlie",
    scheduleCardEmpty: "Nessun orario disponibile per le tue figlie.",
    receiptsEmptyDescription:
      "Quando la segreteria registra un pagamento, la ricevuta intestata a te compare qui e si scarica in PDF.",
    adultDaughterNote:
      "{nome} è maggiorenne: certificato, tessera e presenze li vede lei dalla sua area riservata. Qui restano le rate, i pagamenti e le ricevute intestate a te.",
  }
}
