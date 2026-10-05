import {
  classifyCard,
  seasonYearFromAcademicYearStart,
} from "@/lib/affiliations/card-status"
import { hasGuardianGap, GUARDIAN_GAP_LOSSES } from "@/lib/athletes/guardian-gap"
import { classifyCert } from "@/lib/medical-certificates/certificate-status"
import { compareCurrentFirst } from "@/lib/utils/expiry-status"
import { formatDateShort } from "@/lib/utils/format"

// ─────────────────────────────────────────────────────────────────────────
// Cosa manca a un'allieva appena inserita per essere a posto.
//
// I dati arrivano a pezzi — prima il nome, poi il genitore, poi il corso, il
// certificato, la tessera — e finora chi li completava doveva ricordarsi
// quali mancassero e cercare la sezione giusta nella scheda. Le dieci
// minorenni senza genitore collegato sono la conseguenza di quel flusso.
//
// Funzione pura, senza dipendenze da componenti: la useranno anche la
// dashboard e la lista allieve.
// ─────────────────────────────────────────────────────────────────────────

export type SetupStepId =
  | "guardian"
  | "email"
  | "course"
  | "certificate"
  | "card"

export type SetupStep = {
  id: SetupStepId
  label: string
  // Perché manca, in una riga: cosa non funziona finché resta così
  reason: string
}

export type ChecklistEnrollment = {
  academicYearId: string
  withdrawalDate: Date | null
  deletedAt: Date | null
}

export type ChecklistCertificate = {
  expiryDate: Date
  createdAt: Date
}

export type ChecklistCard = {
  entity: string
  cardYear: number
  expiryDate: Date | null
  createdAt: Date
}

export type ChecklistAthlete = {
  status: "TRIAL" | "ACTIVE" | "SUSPENDED" | "WITHDRAWN"
  dateOfBirth: Date
  email: string | null
  // Genitori collegati e non nel cestino
  linkedParents: number
  // Iscrizioni non filtrate: la funzione decide cosa conta
  enrollments: ChecklistEnrollment[]
  // Certificati non cestinati
  certificates: ChecklistCertificate[]
  // Tessere non cestinate
  cards: ChecklistCard[]
}

export type ChecklistContext = {
  // null a luglio e agosto, o se nessun anno è impostato come corrente: i
  // passi che dipendono dall'anno non si mostrano invece di indovinare
  currentAcademicYear: { id: string; label: string; startDate: Date } | null
  at?: Date
}

const CARD_ENTITY = "ENDAS"

function guardianStep(losses: readonly string[]): SetupStep {
  return {
    id: "guardian",
    label: "Collega un genitore",
    reason: `È minorenne e non ha nessuno collegato: alla famiglia non arrivano ${losses.join(", ")}.`,
  }
}

export function athleteSetupChecklist(
  athlete: ChecklistAthlete,
  context: ChecklistContext,
): SetupStep[] {
  // Ritirata: non c'è niente da completare, ha smesso
  if (athlete.status === "WITHDRAWN") return []

  const at = context.at ?? new Date()
  const steps: SetupStep[] = []

  // 1. Genitore — stessa regola del filtro della lista e della dashboard
  if (hasGuardianGap(athlete, at)) {
    steps.push(guardianStep(GUARDIAN_GAP_LOSSES))
  } else if (
    athlete.linkedParents === 0 &&
    (athlete.email === null || athlete.email.trim().length === 0)
  ) {
    // 2. Email — maggiorenne senza genitori: le comunicazioni vanno a lei
    steps.push({
      id: "email",
      label: "Aggiungi l'email",
      reason:
        "È maggiorenne e non ha genitori collegati: le comunicazioni vanno a lei, e senza email non riceve ricevute, solleciti né inviti agli stage.",
    })
  }

  const year = context.currentAcademicYear

  // 3. Corso — un'iscrizione ritirata conta come presente: a chi ha smesso
  // non si chiede di iscriversi di nuovo
  if (year) {
    const hasEnrollment = athlete.enrollments.some(
      (e) => e.deletedAt === null && e.academicYearId === year.id,
    )
    if (!hasEnrollment) {
      steps.push({
        id: "course",
        label: "Iscrivi a un corso",
        reason: `Nessuna iscrizione per l'anno ${year.label}: senza corso non nascono le rate mensili né il contributo di iscrizione.`,
      })
    }
  }

  // 4. Certificato — corrente = scadenza più lontana, come in lista allieve
  const certificate = [...athlete.certificates].sort(compareCurrentFirst)[0]
  const certStatus = classifyCert(certificate?.expiryDate ?? null, at)
  if (certStatus === "missing" || certStatus === "expired") {
    steps.push({
      id: "certificate",
      label: "Carica il certificato medico",
      reason:
        certStatus === "missing"
          ? "Non ne ha uno: senza certificato valido non può fare lezione."
          : `È scaduto il ${formatDateShort(certificate!.expiryDate)}: senza certificato valido non può fare lezione.`,
    })
  }

  // 5. Tessera — la tessera arriva dall'ente, non si fa sul momento: il passo
  // dice la stessa cosa che dice l'elenco da mandare al referente, cioè che
  // per quell'anno sociale non risulta tesserata
  if (year) {
    const seasonYear = seasonYearFromAcademicYearStart(year.startDate)
    const card = athlete.cards
      .filter((c) => c.entity === CARD_ENTITY && c.cardYear === seasonYear)
      .sort(currentCardFirst)[0]
    const cardStatus = classifyCard(card?.expiryDate ?? null, at)
    if (cardStatus === "missing" || cardStatus === "expired") {
      steps.push({
        id: "card",
        label: `Tesseramento ${CARD_ENTITY}`,
        reason:
          cardStatus === "missing"
            ? `Non risulta tesserata per l'anno sociale ${seasonYear}: è nell'elenco da mandare al referente ${CARD_ENTITY}.`
            : `La tessera ${CARD_ENTITY} ${seasonYear} è scaduta il ${formatDateShort(card!.expiryDate!)}.`,
      })
    }
  }

  return steps
}

// Tessera corrente fra quelle dello stesso anno: scadenza più lontana, come
// CURRENT_CARD_ORDER nelle query. Una tessera senza scadenza (inserita a mano)
// non scavalca una che ce l'ha.
function currentCardFirst(a: ChecklistCard, b: ChecklistCard): number {
  if (a.expiryDate && b.expiryDate) {
    return compareCurrentFirst(
      { expiryDate: a.expiryDate, createdAt: a.createdAt },
      { expiryDate: b.expiryDate, createdAt: b.createdAt },
    )
  }
  if (a.expiryDate) return -1
  if (b.expiryDate) return 1
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
}
