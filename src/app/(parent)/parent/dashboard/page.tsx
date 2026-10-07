import Link from "next/link"
import { CalendarClock, Receipt, Sparkles, Wallet } from "lucide-react"

import { EmptyState } from "@/components/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { requirePortalAccess } from "@/lib/auth/require-portal-access"
import { buildPaymentReference, type PaymentReferenceItem } from "@/lib/payments/payment-reference"
import { portalWording } from "@/lib/portal/wording"
import { isScheduleOverdue } from "@/lib/portal/schedule-status"
import { receiptPdfDownloadHref } from "@/lib/receipts/types"
import { normalizeIban, prettyIban } from "@/lib/schemas/fiscal-validators"
import { PAYMENT_METHOD_LABELS } from "@/lib/schemas/payment"
import { statusTone, TONE_BADGE } from "@/lib/status/tone"
import { formatDateShort, formatEuro } from "@/lib/utils/format"
import { cn } from "@/lib/utils"

import {
  getBrandPaymentInfo,
  getGeneralCourseSchedules,
  getMyAthleteCards,
  getMyAthleteCertificates,
  getMyAthletes,
  getMyAthleteSchedules,
  getMyAttendanceStats,
  getMyOpenSchedules,
  getMyPayments,
  getPortalProfile,
  type GeneralCourseSchedule,
  type MyAthleteSchedule,
  type MyOpenSchedule,
  type MyPayment,
} from "../_actions/queries"
import { countOpenStagesForPortal } from "../_actions/stages"

import { AthleteCardBlock } from "./_components/athlete-card-block"
import { CertificateBlock } from "./_components/certificate-block"
import { PaymentInstructions } from "./_components/payment-instructions"

// ─────────────────────────────────────────────────────────────────────────
// La dashboard della famiglia, dal telefono. Nell'ordine in cui serve:
// cosa c'è da pagare, come si paga, le ricevute, lo stato di certificato e
// tessera per ogni figlia, gli stage, l'orario. Niente grafici, una colonna,
// tasti alti 44 px. Le query sono filtrate per ambito (queries.ts): di una
// figlia maggiorenne restano rate, pagamenti e ricevute intestate a chi
// guarda; fra due genitori nessuno vede le ricevute dell'altro.
// ─────────────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic"

const DAY_OF_WEEK_LABELS = [
  "Domenica",
  "Lunedì",
  "Martedì",
  "Mercoledì",
  "Giovedì",
  "Venerdì",
  "Sabato",
]

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const item of items) {
    const k = key(item)
    map.set(k, [...(map.get(k) ?? []), item])
  }
  return map
}

// Causale per allieva, composta dalle sue rate aperte
function referencesFor(schedules: MyOpenSchedule[]) {
  const byAthlete = groupBy(schedules, (s) => s.athleteId)
  return [...byAthlete.entries()].map(([athleteId, rows]) => {
    const items: PaymentReferenceItem[] = rows.map((s) =>
      s.feeType === "MONTHLY"
        ? { kind: "month", month: s.dueDate }
        : { kind: "other", label: s.description },
    )
    return {
      athleteId,
      athleteName: rows[0].athleteName,
      reference: buildPaymentReference({ athleteName: rows[0].athleteName, items }),
    }
  })
}

export default async function ParentDashboardPage() {
  const { scope } = await requirePortalAccess()
  const wording = portalWording(scope)

  const [
    profile,
    athletes,
    athleteCards,
    athleteCertificates,
    openSchedules,
    payments,
    myAthleteSchedules,
    generalSchedules,
    brand,
    attendance,
    openStagesCount,
  ] = await Promise.all([
    getPortalProfile(scope),
    getMyAthletes(scope),
    getMyAthleteCards(scope),
    getMyAthleteCertificates(scope),
    getMyOpenSchedules(scope),
    getMyPayments(scope),
    getMyAthleteSchedules(scope),
    getGeneralCourseSchedules(),
    getBrandPaymentInfo(),
    getMyAttendanceStats(scope),
    countOpenStagesForPortal(scope),
  ])

  const today = new Date()
  const totalOpenCents = openSchedules.reduce((acc, s) => acc + s.amountCents, 0)
  const overdueCount = openSchedules.filter((s) => isScheduleOverdue(s, today)).length
  const paymentsByAthlete = groupBy(payments, (p) => p.athleteId)
  const iban = brand?.iban ? normalizeIban(brand.iban) : ""

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Ciao {profile?.firstName ?? wording.greetingFallback}
        </h1>
        <p className="text-sm text-muted-foreground">
          {openSchedules.length === 0
            ? "Nessuna rata da pagare: tutto in regola."
            : overdueCount > 0
              ? `${overdueCount === 1 ? "Una rata è" : `${overdueCount} rate sono`} da pagare.`
              : "Le prossime rate sono qui sotto, con la scadenza."}
        </p>
      </header>

      {/* ── Da pagare ─────────────────────────────────────────────────── */}
      <section aria-labelledby="da-pagare" className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="da-pagare" className="text-lg font-semibold">
            Da pagare
          </h2>
          {openSchedules.length > 0 ? (
            <span className="font-mono text-sm tabular-nums text-muted-foreground">
              totale {formatEuro(totalOpenCents)}
            </span>
          ) : null}
        </div>
        {openSchedules.length === 0 ? (
          <Card>
            <CardContent className="p-0">
              <EmptyState
                icon={Wallet}
                title="Nessuna rata da pagare"
                description="Quando la segreteria registra una scadenza la trovi qui, con il mese, l'importo e la data entro cui pagare."
                className="py-8"
              />
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-2">
            {openSchedules.map((s) => {
              const overdue = isScheduleOverdue(s, today)
              const tone = statusTone({ kind: "contributions", overdue })
              return (
                <li key={s.id}>
                  <Card>
                    <CardContent className="space-y-2 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-0.5">
                          <Link
                            href={`#allieva-${s.athleteId}`}
                            className="flex min-h-11 items-center text-sm font-semibold underline-offset-4 hover:underline"
                          >
                            <span className="truncate">{s.athleteName}</span>
                          </Link>
                          <p className="text-sm">{s.description}</p>
                        </div>
                        <span className="shrink-0 font-mono text-base font-semibold tabular-nums">
                          {formatEuro(s.amountCents)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {overdue ? (
                          <Badge variant="outline" className={cn(TONE_BADGE[tone])}>
                            Da pagare
                          </Badge>
                        ) : null}
                        <span>
                          {overdue ? "Scadeva il" : "Scade il"} {formatDateShort(s.dueDate)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* ── Come pagare: solo con l'IBAN compilato ────────────────────── */}
      {iban ? (
        <section aria-label="Come pagare">
          <PaymentInstructions
            accountHolder={brand?.accountHolder ?? ""}
            ibanPretty={prettyIban(iban)}
            ibanElectronic={iban}
            references={referencesFor(openSchedules)}
          />
        </section>
      ) : null}

      {/* ── Ricevute ──────────────────────────────────────────────────── */}
      <section aria-labelledby="ricevute" className="space-y-3">
        <h2 id="ricevute" className="text-lg font-semibold">
          Ricevute
        </h2>
        {payments.length === 0 ? (
          <Card>
            <CardContent className="p-0">
              <EmptyState
                icon={Receipt}
                title="Nessuna ricevuta ancora"
                description={wording.receiptsEmptyDescription}
                className="py-8"
              />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {athletes
              .filter((a) => paymentsByAthlete.has(a.id))
              .map((athlete) => (
                <ReceiptsCard
                  key={athlete.id}
                  athleteId={athlete.id}
                  athleteName={`${athlete.firstName} ${athlete.lastName}`}
                  payments={paymentsByAthlete.get(athlete.id) ?? []}
                />
              ))}
            {/* Pagamenti di allieve archiviate: niente scheda sopra, ma le
                ricevute restano della famiglia */}
            {[...paymentsByAthlete.entries()]
              .filter(([athleteId]) => !athletes.some((a) => a.id === athleteId))
              .map(([athleteId, rows]) => (
                <ReceiptsCard
                  key={athleteId}
                  athleteId={athleteId}
                  athleteName={rows[0].athleteName}
                  archived
                  payments={rows}
                />
              ))}
          </div>
        )}
      </section>

      {/* ── Le mie figlie: certificato, tessera, corsi, presenze ─────── */}
      <section aria-labelledby="figlie" className="space-y-3">
        <h2 id="figlie" className="text-lg font-semibold">
          {wording.peopleSectionTitle}
        </h2>
        {athletes.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              {wording.peopleSectionEmpty}
            </CardContent>
          </Card>
        ) : (
          athletes.map((athlete) => {
            const stats = attendance.byAthlete.get(athlete.id)
            return (
              <Card key={athlete.id} id={`allieva-${athlete.id}`} className="scroll-mt-20">
                <CardHeader>
                  <CardTitle className="text-base">
                    {athlete.firstName} {athlete.lastName}
                  </CardTitle>
                  <CardDescription>
                    {athlete.enrollments.length === 0
                      ? "Nessun corso attivo"
                      : athlete.enrollments.map((e) => e.courseName).join(" · ")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {athlete.personalDataVisible ? (
                    <>
                      <CertificateBlock
                        expiryDate={athleteCertificates.get(athlete.id)?.expiryDate ?? null}
                      />
                      <AthleteCardBlock card={athleteCards.get(athlete.id) ?? null} />
                      <p className="text-sm text-muted-foreground">
                        {!stats || stats.totalLessons === 0
                          ? "Presenze: nessuna lezione registrata ancora."
                          : `Presenze ${attendance.academicYearLabel ?? ""}: ${stats.presentCount} ${
                              stats.presentCount === 1 ? "presente" : "presenti"
                            }, ${stats.absentCount} ${
                              stats.absentCount === 1 ? "assente" : "assenti"
                            }${stats.justifiedCount > 0 ? `, ${stats.justifiedCount} giustificate` : ""} su ${
                              stats.totalLessons
                            } ${stats.totalLessons === 1 ? "lezione" : "lezioni"}.`}
                      </p>
                    </>
                  ) : (
                    <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                      {wording.adultDaughterNote.replace("{nome}", athlete.firstName)}
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </section>

      {/* ── Stage ─────────────────────────────────────────────────────── */}
      <section aria-labelledby="stage" className="space-y-3">
        <h2 id="stage" className="text-lg font-semibold">
          Prossimi stage
        </h2>
        <Card>
          <CardContent className="space-y-3 py-4">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="space-y-0.5 text-sm">
                <p className="font-medium">
                  {openStagesCount === 0
                    ? "Nessuno stage aperto all'iscrizione"
                    : openStagesCount === 1
                      ? "1 stage aperto all'iscrizione"
                      : `${openStagesCount} stage aperti all'iscrizione`}
                </p>
                <p className="text-muted-foreground">
                  {openStagesCount === 0
                    ? "Quando la scuola ne apre uno lo trovi qui."
                    : wording.stagesCardHint}
                </p>
              </div>
            </div>
            <Button asChild variant={openStagesCount > 0 ? "default" : "outline"} className="min-h-11 w-full">
              <Link href="/parent/stages">Vedi gli stage</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* ── Orario ────────────────────────────────────────────────────── */}
      <section aria-labelledby="orari" className="space-y-3">
        <h2 id="orari" className="text-lg font-semibold">
          Orario lezioni
        </h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{wording.scheduleCardTitle}</CardTitle>
            <CardDescription>Corsi attivi dell&apos;anno accademico in corso.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {myAthleteSchedules.length === 0 ? (
              <p className="px-4 pb-4 text-sm text-muted-foreground">
                {wording.scheduleCardEmpty}
              </p>
            ) : (
              <ScheduleList items={myAthleteSchedules} />
            )}
          </CardContent>
        </Card>

        <details className="group rounded-lg border bg-card">
          <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 px-4 py-3 text-sm font-medium">
            <span className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              Orario completo della scuola
            </span>
            <span className="text-xs text-muted-foreground transition group-open:rotate-180">
              ▾
            </span>
          </summary>
          <div className="border-t">
            {generalSchedules.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted-foreground">
                Nessun corso attivo registrato.
              </p>
            ) : (
              <ScheduleList items={generalSchedules} />
            )}
          </div>
        </details>
      </section>
    </div>
  )
}

// Le ricevute di un'allieva: una riga per pagamento, con «Scarica» a tutta
// larghezza. Il PDF lo serve /ricevute/[id] con la sessione di chi lo apre e
// gli stessi controlli di ambito delle query (canSeeReceipt): l'altro
// genitore vede che una ricevuta esiste, non a chi è intestata né il file.
function ReceiptsCard({
  athleteId,
  athleteName,
  payments,
  archived = false,
}: {
  athleteId: string
  athleteName: string
  payments: MyPayment[]
  archived?: boolean
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {archived ? (
            <>
              {athleteName}{" "}
              <span className="text-xs font-normal text-muted-foreground">(archiviata)</span>
            </>
          ) : (
            <Link
              href={`#allieva-${athleteId}`}
              className="inline-flex min-h-11 items-center underline-offset-4 hover:underline"
            >
              {athleteName}
            </Link>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y">
          {payments.map((p) => (
            <li key={p.id} className="space-y-2 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-0.5">
                  {p.receipt ? (
                    <p className="font-mono text-sm font-semibold tabular-nums">
                      n. {p.receipt.receiptNumber}
                    </p>
                  ) : null}
                  <p className="text-sm">{p.feeLabel}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateShort(p.receipt?.issueDate ?? p.paymentDate)} ·{" "}
                    {PAYMENT_METHOD_LABELS[p.method]}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 font-mono text-sm tabular-nums",
                    p.status === "REVERSED" && "text-muted-foreground line-through",
                  )}
                >
                  {formatEuro(p.amountCents)}
                </span>
              </div>
              {p.lines.length > 0 ? (
                <ul className="space-y-0.5 text-xs text-muted-foreground">
                  {p.lines.map((line, index) => (
                    <li key={`${index}-${line.description}`} className="flex justify-between gap-3">
                      <span>{line.description}</span>
                      <span className="shrink-0 font-mono tabular-nums">
                        {formatEuro(line.amountCents)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {p.status === "REVERSED" ? (
                <p className="text-xs text-muted-foreground">Pagamento stornato.</p>
              ) : p.receipt ? (
                <Button asChild variant="outline" className="min-h-11 w-full">
                  <a href={receiptPdfDownloadHref(p.receipt.id)}>
                    <Receipt className="mr-2 h-4 w-4" />
                    Scarica la ricevuta
                  </a>
                </Button>
              ) : p.receiptHeldByOther ? (
                <p className="text-xs text-muted-foreground">
                  Ricevuta intestata a un&apos;altra persona: la trova lei nella sua area riservata.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Ricevuta non ancora emessa: compare qui appena la segreteria la prepara.
                </p>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

type ScheduleListItem = MyAthleteSchedule | GeneralCourseSchedule

function ScheduleList({ items }: { items: ScheduleListItem[] }) {
  const grouped = new Map<number, ScheduleListItem[]>()
  for (const item of items) {
    grouped.set(item.dayOfWeek, [...(grouped.get(item.dayOfWeek) ?? []), item])
  }
  const days = [...grouped.keys()].sort((a, b) => a - b)

  return (
    <div className="divide-y">
      {days.map((d) => (
        <div key={d} className="px-4 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {DAY_OF_WEEK_LABELS[d]}
          </p>
          <ul className="space-y-2">
            {(grouped.get(d) ?? []).map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{item.courseName}</p>
                  {item.location ? (
                    <p className="text-xs text-muted-foreground">{item.location}</p>
                  ) : null}
                </div>
                <span className="shrink-0 font-mono text-sm tabular-nums text-muted-foreground">
                  {item.startTime}–{item.endTime}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
