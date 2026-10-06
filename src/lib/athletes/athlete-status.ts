import {
  classifyCard,
  seasonYearFromAcademicYearStart,
} from "@/lib/affiliations/card-status"
import { classifyCert } from "@/lib/medical-certificates/certificate-status"
import { daysOverdue } from "@/lib/scadenze/due-label"
import { compareCurrentFirst } from "@/lib/utils/expiry-status"
import { statusTone, type StatusTone } from "@/lib/status/tone"
import { formatDateShort, formatEur } from "@/lib/utils/format"

// ─────────────────────────────────────────────────────────────────────────
// I tre stati in testa alla scheda: certificato, contributi, tessera.
//
// Prima bisognava scorrere tutta la pagina per sapere se un'allieva poteva
// entrare in sala e se era in pari con i pagamenti. Qui stanno in alto, e le
// regole non sono riscritte: il certificato lo classifica classifyCert come
// nella lista Certificati, la tessera classifyCard sull'anno sociale come nel
// passo di setup-checklist e nella pagina Tessere, il ritardo è lo stesso
// predicato dell'elenco Scadenze — rata non pagata con la scadenza passata,
// contata sul giorno di Roma.
//
// Il colore non si decide qui: lo dà statusTone dallo stato di dominio, lo
// stesso che colora i badge, i riquadri della dashboard e i contatori del
// menu. Rosso dove manca la copertura per fare lezione (certificato,
// tessera), ambra dove si sistema con calma (contributi in ritardo).
// ─────────────────────────────────────────────────────────────────────────

export type { StatusTone }

export type StatusAction = "CARICA_CERTIFICATO" | "VAI_TESSERAMENTO"

export type AthleteStatusItem = {
  tone: StatusTone
  label: string
  detail: string | null
  action: StatusAction | null
}

export type AthleteStatusStrip = {
  certificate: AthleteStatusItem
  contributions: AthleteStatusItem & { overdueCents: number }
  card: AthleteStatusItem
}

const CARD_ENTITY = "ENDAS"

export type StatusInput = {
  certificates: { expiryDate: Date; createdAt: Date }[]
  cards: {
    entity: string
    cardYear: number
    expiryDate: Date | null
    createdAt: Date
  }[]
  // Tutte le rate dell'allieva, già senza quelle nel Cestino
  schedules: { status: string; dueDate: Date; amountCents: number }[]
  currentAcademicYear: { startDate: Date } | null
  at?: Date
}

function currentCardFirst(
  a: { expiryDate: Date | null; createdAt: Date },
  b: { expiryDate: Date | null; createdAt: Date },
): number {
  const ax = a.expiryDate?.getTime() ?? 0
  const bx = b.expiryDate?.getTime() ?? 0
  if (ax !== bx) return bx - ax
  return b.createdAt.getTime() - a.createdAt.getTime()
}

export function athleteStatusStrip(input: StatusInput): AthleteStatusStrip {
  const at = input.at ?? new Date()

  // ── Certificato: corrente = scadenza più lontana, come in lista allieve
  const certificate = [...input.certificates].sort(compareCurrentFirst)[0]
  const certStatus = classifyCert(certificate?.expiryDate ?? null, at)
  const certItem: AthleteStatusItem =
    certStatus === "missing"
      ? {
          tone: statusTone({ kind: "certificate", status: certStatus }),
          label: "Certificato mancante",
          detail: "Senza non può fare lezione",
          action: "CARICA_CERTIFICATO",
        }
      : certStatus === "expired"
        ? {
            tone: statusTone({ kind: "certificate", status: certStatus }),
            label: "Certificato scaduto",
            detail: `Scaduto il ${formatDateShort(certificate!.expiryDate)}`,
            action: "CARICA_CERTIFICATO",
          }
        : certStatus === "expiring"
          ? {
              tone: statusTone({ kind: "certificate", status: certStatus }),
              label: "Certificato in scadenza",
              detail: `Scade il ${formatDateShort(certificate!.expiryDate)}`,
              action: "CARICA_CERTIFICATO",
            }
          : {
              tone: statusTone({ kind: "certificate", status: certStatus }),
              label: "Certificato valido",
              detail: `Fino al ${formatDateShort(certificate!.expiryDate)}`,
              action: null,
            }

  // ── Contributi: stesso predicato dell'elenco Scadenze
  const overdueCents = input.schedules.reduce(
    (sum, s) =>
      s.status === "DUE" && daysOverdue(s.dueDate, at) > 0
        ? sum + s.amountCents
        : sum,
    0,
  )
  const contributions = {
    tone: statusTone({ kind: "contributions", overdue: overdueCents > 0 }),
    label: overdueCents > 0 ? "Contributi in ritardo" : "Contributi in regola",
    detail: overdueCents > 0 ? formatEur(overdueCents) : null,
    action: null,
    overdueCents,
  }

  // ── Tessera: anno sociale dell'anno accademico corrente, come il passo
  // "Tesseramento" della scheda e l'elenco da mandare al referente
  const year = input.currentAcademicYear
  const seasonYear = year
    ? seasonYearFromAcademicYearStart(year.startDate)
    : null
  const card =
    seasonYear === null
      ? null
      : [...input.cards]
          .filter((c) => c.entity === CARD_ENTITY && c.cardYear === seasonYear)
          .sort(currentCardFirst)[0]
  const cardStatus = classifyCard(card?.expiryDate ?? null, at)
  const cardItem: AthleteStatusItem =
    seasonYear === null
      ? {
          tone: "neutral" as StatusTone,
          label: "Tessera",
          detail: "Nessun anno accademico corrente",
          action: null,
        }
      : cardStatus === "missing"
        ? {
            // Senza tessera non c'è assicurazione: rosso come il certificato
            tone: statusTone({ kind: "card", status: cardStatus }),
            label: `Non tesserata ${seasonYear}`,
            detail: "È nell'elenco da mandare al referente",
            action: "VAI_TESSERAMENTO",
          }
        : cardStatus === "expired"
          ? {
              tone: statusTone({ kind: "card", status: cardStatus }),
              label: `Tessera ${seasonYear} scaduta`,
              detail: card?.expiryDate
                ? `Scaduta il ${formatDateShort(card.expiryDate)}`
                : null,
              action: "VAI_TESSERAMENTO",
            }
          : cardStatus === "expiring"
            ? {
                tone: statusTone({ kind: "card", status: cardStatus }),
                label: `Tessera ${seasonYear} in scadenza`,
                detail: card?.expiryDate
                  ? `Scade il ${formatDateShort(card.expiryDate)}`
                  : null,
                action: null,
              }
            : {
                tone: statusTone({ kind: "card", status: cardStatus }),
                label: `Tesserata ${seasonYear}`,
                detail: card?.expiryDate
                  ? `Fino al ${formatDateShort(card.expiryDate)}`
                  : null,
                action: null,
              }

  return { certificate: certItem, contributions, card: cardItem }
}
