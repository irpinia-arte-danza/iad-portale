import { AlertCircle, AlertTriangle, CalendarClock, CheckCircle2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { requireParent } from "@/lib/auth/require-parent"
import { FEE_TYPE_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/schemas/payment"
import { formatDateShort, formatEur } from "@/lib/utils/format"
import { cn } from "@/lib/utils"

import {
  getBrandIban,
  getGeneralCourseSchedules,
  getMyAthletes,
  getMyAthleteSchedules,
  getMyOpenSchedules,
  getMyPayments,
  getParentProfile,
  type MyOpenSchedule,
  type MyPayment,
  type GeneralCourseSchedule,
  type MyAthleteSchedule,
} from "../_actions/queries"

import { IbanCard } from "./_components/iban-card"
import { ReceiptDownloadButton } from "./_components/receipt-download-button"

const DAY_OF_WEEK_LABELS = [
  "Domenica",
  "Lunedì",
  "Martedì",
  "Mercoledì",
  "Giovedì",
  "Venerdì",
  "Sabato",
]

const DAYS_AHEAD_THRESHOLD = 7

function classifySchedule(s: MyOpenSchedule): "overdue" | "soon" | "due" {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(s.dueDate)
  due.setHours(0, 0, 0, 0)
  if (s.status === "OVERDUE" || due.getTime() < today.getTime()) return "overdue"
  const diffDays = (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  if (diffDays <= DAYS_AHEAD_THRESHOLD) return "soon"
  return "due"
}

function groupByDay<T extends { dayOfWeek: number }>(
  items: T[],
): Map<number, T[]> {
  const map = new Map<number, T[]>()
  for (const item of items) {
    const list = map.get(item.dayOfWeek) ?? []
    list.push(item)
    map.set(item.dayOfWeek, list)
  }
  return map
}

export default async function ParentDashboardPage() {
  const { parentId } = await requireParent()

  const [
    profile,
    athletes,
    openSchedules,
    payments,
    myAthleteSchedules,
    generalSchedules,
    brand,
  ] = await Promise.all([
    getParentProfile(parentId),
    getMyAthletes(parentId),
    getMyOpenSchedules(parentId),
    getMyPayments(parentId),
    getMyAthleteSchedules(parentId),
    getGeneralCourseSchedules(),
    getBrandIban(),
  ])

  const overdue = openSchedules.filter((s) => classifySchedule(s) === "overdue")
  const soon = openSchedules.filter((s) => classifySchedule(s) === "soon")

  const totalOverdueCents = overdue.reduce((acc, s) => acc + s.amountCents, 0)
  const totalSoonCents = soon.reduce((acc, s) => acc + s.amountCents, 0)

  // Schedules per allieva (mappa athleteId → MyOpenSchedule[])
  const schedulesByAthlete = new Map<string, MyOpenSchedule[]>()
  for (const s of openSchedules) {
    const list = schedulesByAthlete.get(s.athleteId) ?? []
    list.push(s)
    schedulesByAthlete.set(s.athleteId, list)
  }

  // Last 3 payments per allieva (per "ultimi pagamenti" inline nella card)
  const paymentsByAthlete = new Map<string, MyPayment[]>()
  for (const p of payments) {
    const list = paymentsByAthlete.get(p.athleteId) ?? []
    if (list.length < 3) list.push(p)
    paymentsByAthlete.set(p.athleteId, list)
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      {/* Header welcome */}
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Ciao {profile?.firstName ?? "Genitore"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Benvenuta nella tua area riservata.
        </p>
      </header>

      {/* Alert riassuntivo */}
      <SummaryAlert
        overdueCount={overdue.length}
        overdueCents={totalOverdueCents}
        soonCount={soon.length}
        soonCents={totalSoonCents}
      />

      {/* IBAN bonifico */}
      <IbanCard
        iban={brand?.asdIban ?? null}
        asdName={brand?.asdName ?? null}
        asdEmail={brand?.asdEmail ?? null}
      />

      {/* Sezione Le mie figlie */}
      <section id="figlie" className="space-y-3">
        <h2 className="text-lg font-semibold">Le mie figlie</h2>
        {athletes.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              Nessuna allieva associata al tuo account.
              <br />
              Contatta la segreteria per assistenza.
            </CardContent>
          </Card>
        ) : (
          athletes.map((athlete) => {
            const athleteSchedules = schedulesByAthlete.get(athlete.id) ?? []
            const athletePayments = paymentsByAthlete.get(athlete.id) ?? []
            return (
              <Card key={athlete.id}>
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold uppercase">
                      {athlete.firstName.charAt(0)}
                      {athlete.lastName.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base">
                        {athlete.firstName} {athlete.lastName}
                      </CardTitle>
                      <CardDescription className="mt-0.5 truncate">
                        {athlete.enrollments.length === 0
                          ? "Nessun corso attivo"
                          : athlete.enrollments
                              .map((e) => e.courseName)
                              .join(" · ")}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Scadenze aperte */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Scadenze aperte
                    </h3>
                    {athleteSchedules.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Tutto in regola ✓
                      </p>
                    ) : (
                      <ul className="divide-y rounded-md border">
                        {athleteSchedules.map((s) => {
                          const cls = classifySchedule(s)
                          return (
                            <li
                              key={s.id}
                              className="flex items-center justify-between gap-3 px-3 py-2"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium">
                                  {FEE_TYPE_LABELS[s.feeType]}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Scadenza {formatDateShort(s.dueDate)}
                                </p>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                <span className="font-mono text-sm tabular-nums">
                                  {formatEur(s.amountCents)}
                                </span>
                                {cls === "overdue" ? (
                                  <Badge variant="destructive">Scaduta</Badge>
                                ) : cls === "soon" ? (
                                  <Badge className="bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
                                    In scadenza
                                  </Badge>
                                ) : null}
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>

                  {/* Ultimi pagamenti */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Ultimi pagamenti
                    </h3>
                    {athletePayments.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Nessun pagamento registrato.
                      </p>
                    ) : (
                      <ul className="divide-y rounded-md border">
                        {athletePayments.map((p) => (
                          <li
                            key={p.id}
                            className="flex items-center justify-between gap-3 px-3 py-2"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium">
                                {FEE_TYPE_LABELS[p.feeType]}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDateShort(p.paymentDate)}
                              </p>
                            </div>
                            <span className="shrink-0 font-mono text-sm tabular-nums">
                              {formatEur(p.amountCents)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </section>

      {/* Storico pagamenti globale */}
      <section id="storico" className="space-y-3">
        <h2 className="text-lg font-semibold">Storico pagamenti</h2>
        <Card>
          <CardContent className="p-0">
            {payments.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                Nessun pagamento ancora registrato.
              </p>
            ) : (
              <ul className="divide-y">
                {payments.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {FEE_TYPE_LABELS[p.feeType]} ·{" "}
                        <span className="font-normal">{p.athleteName}</span>
                        {p.athleteArchived ? (
                          <span className="ml-1 text-xs text-muted-foreground">
                            (archiviata)
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateShort(p.paymentDate)} ·{" "}
                        {PAYMENT_METHOD_LABELS[p.method]}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <span className="font-mono text-sm tabular-nums">
                        {formatEur(p.amountCents)}
                      </span>
                      <ReceiptDownloadButton
                        paymentId={p.id}
                        receiptNumber={p.receiptNumber}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Orari lezioni */}
      <section id="orari" className="space-y-3">
        <h2 className="text-lg font-semibold">Orario lezioni</h2>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Le mie figlie</CardTitle>
            <CardDescription>
              Corsi attivi dell&apos;anno accademico in corso.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {myAthleteSchedules.length === 0 ? (
              <p className="px-4 pb-4 pt-0 text-sm text-muted-foreground">
                Nessun orario disponibile per le tue figlie.
              </p>
            ) : (
              <ScheduleList items={myAthleteSchedules} />
            )}
          </CardContent>
        </Card>

        <details className="group rounded-lg border bg-card">
          <summary className="flex cursor-pointer items-center justify-between gap-2 p-4 text-base font-medium">
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
              <ScheduleList items={generalSchedules} showCourseType />
            )}
          </div>
        </details>
      </section>
    </div>
  )
}

function SummaryAlert({
  overdueCount,
  overdueCents,
  soonCount,
  soonCents,
}: {
  overdueCount: number
  overdueCents: number
  soonCount: number
  soonCents: number
}) {
  if (overdueCount > 0) {
    return (
      <Card className="border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100">
        <CardContent className="flex items-start gap-3 py-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="space-y-1 text-sm">
            <p className="font-semibold">
              {overdueCount === 1
                ? "1 quota scaduta"
                : `${overdueCount} quote scadute`}{" "}
              · {formatEur(overdueCents)}
            </p>
            <p className="text-xs">
              Salda al più presto per evitare la sospensione della copertura.
            </p>
            <a href="#figlie" className="text-xs font-medium underline">
              Vedi dettaglio
            </a>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (soonCount > 0) {
    return (
      <Card className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
        <CardContent className="flex items-start gap-3 py-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="space-y-1 text-sm">
            <p className="font-semibold">
              {soonCount === 1
                ? "1 quota in scadenza"
                : `${soonCount} quote in scadenza`}{" "}
              · {formatEur(soonCents)}
            </p>
            <p className="text-xs">
              Scadenza entro 7 giorni.
            </p>
            <a href="#figlie" className="text-xs font-medium underline">
              Vedi dettaglio
            </a>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100">
      <CardContent className="flex items-start gap-3 py-4">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="space-y-1 text-sm">
          <p className="font-semibold">Tutto in regola</p>
          <p className="text-xs">
            Nessuna quota in sospeso al momento. Buon allenamento!
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

type ScheduleListItem =
  | (MyAthleteSchedule & { courseType?: undefined })
  | GeneralCourseSchedule

function ScheduleList({
  items,
  showCourseType = false,
}: {
  items: ScheduleListItem[]
  showCourseType?: boolean
}) {
  const grouped = groupByDay(items)
  const days = Array.from(grouped.keys()).sort((a, b) => a - b)

  return (
    <div className="divide-y">
      {days.map((d) => (
        <div key={d} className="px-4 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {DAY_OF_WEEK_LABELS[d]}
          </p>
          <ul className="space-y-2">
            {(grouped.get(d) ?? []).map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{item.courseName}</p>
                  {item.location ? (
                    <p className="text-xs text-muted-foreground">
                      {item.location}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "font-mono text-sm tabular-nums text-muted-foreground",
                    )}
                  >
                    {item.startTime}–{item.endTime}
                  </span>
                  {showCourseType && "courseType" in item && item.courseType ? (
                    <Badge variant="secondary" className="text-xs">
                      {item.courseType.replace(/_/g, " ").toLowerCase()}
                    </Badge>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
