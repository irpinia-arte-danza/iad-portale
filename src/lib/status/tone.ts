import type { CardStatus } from "@/lib/affiliations/card-status"
import type { SetupStepId } from "@/lib/athletes/setup-checklist"
import type { CertStatus } from "@/lib/medical-certificates/certificate-status"

// ─────────────────────────────────────────────────────────────────────────
// Due colori, e un significato solo. Deciso con Giuseppina.
//
// ROSSO (block) = blocca la lezione o un documento:
//   • certificato medico scaduto o assente — non può entrare in sala;
//   • tessera dell'ente assente o scaduta — senza tessera non c'è
//     assicurazione, e senza assicurazione non si fa lezione;
//   • minorenne senza genitore collegato — non si emettono ricevute né
//     solleciti, la famiglia è irraggiungibile.
//
// AMBRA (fix) = da sistemare, ma intanto la lezione si fa:
//   contributi in ritardo, ricevute da consegnare, dati da completare,
//   genitori mai invitati.
//
// NEUTRO = tutto il resto, uscite del bilancio comprese: un'uscita non è un
// problema, è il mestiere.
//
// Il colore lo decide solo questa funzione. I componenti non scrivono più
// red-* o amber-*: chiedono qui e applicano le classi dei token.
// ─────────────────────────────────────────────────────────────────────────

export type StatusTone = "block" | "fix" | "neutral"

export type DomainStatus =
  | { kind: "certificate"; status: CertStatus }
  | { kind: "card"; status: CardStatus }
  // Minorenne senza nessun genitore collegato
  | { kind: "guardian"; missing: boolean }
  | { kind: "contributions"; overdue: boolean }
  | { kind: "receipt"; toDeliver: boolean; cancelled?: boolean }
  | { kind: "access"; invited: boolean }
  | { kind: "setupStep"; step: SetupStepId }

export function statusTone(status: DomainStatus): StatusTone {
  switch (status.kind) {
    case "certificate":
      // "in scadenza" avvisa, non blocca: finché è valido si fa lezione
      if (status.status === "missing" || status.status === "expired") {
        return "block"
      }
      return status.status === "expiring" ? "fix" : "neutral"

    case "card":
      if (status.status === "missing" || status.status === "expired") {
        return "block"
      }
      return status.status === "expiring" ? "fix" : "neutral"

    case "guardian":
      return status.missing ? "block" : "neutral"

    case "contributions":
      return status.overdue ? "fix" : "neutral"

    case "receipt":
      if (status.cancelled) return "neutral"
      return status.toDeliver ? "fix" : "neutral"

    case "access":
      return status.invited ? "neutral" : "fix"

    case "setupStep":
      // I passi della scheda: quelli che bloccano sono gli stessi di sopra
      return status.step === "certificate" || status.step === "card"
        ? "block"
        : status.step === "guardian"
          ? "block"
          : "fix"
  }
}

// ── Classi, una sola volta ────────────────────────────────────────────────
// I token vivono in globals.css (@theme): qui si compongono nei tre modi in
// cui servono — un badge, una superficie (riquadro, riga), il solo testo.

export const TONE_BADGE: Record<StatusTone, string> = {
  block:
    "border-status-block-border bg-status-block-bg text-status-block",
  fix: "border-status-fix-border bg-status-fix-bg text-status-fix",
  neutral: "",
}

export const TONE_SURFACE: Record<StatusTone, string> = {
  block: "border-status-block-border bg-status-block-bg",
  fix: "border-status-fix-border bg-status-fix-bg",
  neutral: "border-border bg-muted/30",
}

export const TONE_TEXT: Record<StatusTone, string> = {
  block: "text-status-block",
  fix: "text-status-fix",
  neutral: "text-foreground",
}
