"use client"

import { useState } from "react"
import { CalendarDays, MessageCircle, Wallet } from "lucide-react"
import type { PaymentMethod } from "@prisma/client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ReceiptEmailActions } from "@/app/(admin)/admin/receipts/_components/receipt-email-actions"
import { SendReminderDialog } from "@/app/(admin)/admin/scadenze/_components/send-reminder-dialog"
import type { AthleteRecentPayment } from "@/app/(admin)/admin/athletes/queries"
import type { OpenScheduleOption } from "@/app/(admin)/admin/payments/queries"
import { receiptPdfHref } from "@/lib/receipts/types"
import { dueLabel } from "@/lib/scadenze/due-label"
import { formatDateShort, formatEur } from "@/lib/utils/format"
import { cn } from "@/lib/utils"

import { useOpenScheduleSettle } from "../../_components/schedule-settle-provider"

// ─────────────────────────────────────────────────────────────────────────
// La panoramica: a sinistra i soldi, a destra quello che manca.
//
// È la schermata che si guarda con la famiglia davanti: cosa c'è da
// incassare, cosa è stato appena incassato (con la ricevuta da consegnare) e
// cosa resta da completare. Tutto il resto sta nelle altre schede.
// ─────────────────────────────────────────────────────────────────────────

const METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: "Contanti",
  TRANSFER: "Bonifico",
  POS: "POS",
  SUMUP_LINK: "Link SumUp",
  OTHER: "Altro",
}

interface AthleteOverviewProps {
  athlete: { id: string; firstName: string; lastName: string }
  openSchedules: OpenScheduleOption[]
  recentPayments: AthleteRecentPayment[]
  lastMethod: PaymentMethod | null
  // Colonna di destra: "Da completare" e i corsi dell'anno
  checklist: React.ReactNode
  courses: React.ReactNode
}

export function AthleteOverview({
  athlete,
  openSchedules,
  recentPayments,
  lastMethod,
  checklist,
  courses,
}: AthleteOverviewProps) {
  const openSettle = useOpenScheduleSettle()
  const [reminderScheduleId, setReminderScheduleId] = useState<string | null>(
    null,
  )

  const total = openSchedules.reduce((sum, s) => sum + s.amountCents, 0)
  const athleteRef = {
    id: athlete.id,
    firstName: athlete.firstName,
    lastName: athlete.lastName,
  }

  function settle(selection: OpenScheduleOption[]) {
    const first = selection[0]
    openSettle({
      id: first?.id ?? "",
      feeType: first?.feeType ?? "OTHER",
      courseEnrollmentId: null,
      courseName: first?.description ?? "Pagamento",
      dueDate: first?.dueDate ?? new Date(),
      amountCents: first?.amountCents ?? 0,
      selection: selection.map((s) => ({
        id: s.id,
        amountCents: s.amountCents,
      })),
      athlete: athleteRef,
      defaultMethod: lastMethod,
    })
  }

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
              <div className="space-y-1.5">
                <CardTitle>Da incassare</CardTitle>
                <CardDescription>
                  {openSchedules.length === 0
                    ? "Nessun contributo aperto."
                    : `${openSchedules.length} ${openSchedules.length === 1 ? "contributo aperto" : "contributi aperti"} · ${formatEur(total)}`}
                </CardDescription>
              </div>
              {openSchedules.length > 1 ? (
                <Button
                  size="sm"
                  className="h-11 shrink-0"
                  onClick={() => settle(openSchedules)}
                >
                  <Wallet className="h-4 w-4" />
                  Incassa tutte
                </Button>
              ) : null}
            </CardHeader>
            <CardContent>
              {openSchedules.length === 0 ? (
                <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Tutto pagato.
                </p>
              ) : (
                <ul className="space-y-2">
                  {openSchedules.map((s) => {
                    const due = dueLabel(s.dueDate, new Date())
                    return (
                      <li
                        key={s.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {s.description}
                          </p>
                          <p
                            className={cn(
                              "text-xs",
                              due.tone === "amber"
                                ? "text-amber-700 dark:text-amber-400"
                                : "text-muted-foreground",
                            )}
                          >
                            {formatDateShort(s.dueDate)} · {due.text}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">
                            {formatEur(s.amountCents)}
                          </span>
                          <Button
                            size="sm"
                            className="h-11 md:h-9"
                            onClick={() => settle([s])}
                          >
                            Incassa
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-11 md:h-9"
                            onClick={() => setReminderScheduleId(s.id)}
                          >
                            <MessageCircle className="h-4 w-4" />
                            Sollecita
                          </Button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ultimi pagamenti</CardTitle>
              <CardDescription>
                Gli ultimi tre, con la ricevuta da consegnare.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentPayments.length === 0 ? (
                <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Nessun pagamento registrato.
                </p>
              ) : (
                <ul className="space-y-3">
                  {recentPayments.map((p) => (
                    <li key={p.id} className="rounded-md border p-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {p.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateShort(p.paymentDate)} ·{" "}
                            {METHOD_LABEL[p.method]}
                          </p>
                        </div>
                        <span className="font-mono text-sm">
                          {formatEur(p.amountCents)}
                        </span>
                      </div>
                      {p.receipt ? (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <a
                            href={receiptPdfHref(p.receipt.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-xs underline underline-offset-4"
                          >
                            {p.receipt.receiptNumber}
                          </a>
                          <ReceiptEmailActions
                            receiptId={p.receipt.id}
                            receiptNumber={p.receipt.receiptNumber}
                            athleteName={`${athlete.firstName} ${athlete.lastName}`}
                            status={p.receipt.status}
                            payerName={p.receipt.payerName}
                            payerEmail={p.receipt.payerEmail}
                          />
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Ricevuta non ancora emessa.
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          {checklist}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                Corsi dell&apos;anno
              </CardTitle>
            </CardHeader>
            <CardContent>{courses}</CardContent>
          </Card>
        </div>
      </div>

      <SendReminderDialog
        open={reminderScheduleId !== null}
        onOpenChange={(open) => {
          if (!open) setReminderScheduleId(null)
        }}
        scheduleIds={reminderScheduleId ? [reminderScheduleId] : []}
        payerCount={1}
      />
    </>
  )
}
