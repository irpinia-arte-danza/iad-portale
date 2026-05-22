"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"

import type { PaymentMode } from "@prisma/client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { PAYMENT_MODE_LABELS } from "@/lib/schemas/showcase"

import {
  confirmParticipation,
  createParticipationsBulk,
  deleteParticipation,
  unconfirmParticipation,
  updateChoreography,
} from "../../actions"
import type { ShowcaseWithDetails } from "../../queries"

const DATE_IT = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

const EUR = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
})

type EnrollableAthlete = {
  id: string
  firstName: string
  lastName: string
  enrolledInCurrentAY: boolean
  courses: string[]
}

type Props = {
  showcase: ShowcaseWithDetails
  enrollableAthletes: EnrollableAthlete[]
}

type ParticipationRow = ShowcaseWithDetails["participations"][number]

export function ShowcaseRosterTab({
  showcase,
  enrollableAthletes,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [filter, setFilter] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmTarget, setConfirmTarget] = useState<ParticipationRow | null>(
    null,
  )
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("SPLIT")
  const [busyParticipationId, setBusyParticipationId] = useState<string | null>(
    null,
  )

  // Raggruppa partecipazioni per corso (basato sul primo corso AA corrente)
  const grouped = useMemo(() => {
    const groups = new Map<string, ParticipationRow[]>()
    for (const p of showcase.participations) {
      const courseName =
        p.athlete.enrollments[0]?.course.name ?? "Senza corso AA corrente"
      if (!groups.has(courseName)) groups.set(courseName, [])
      groups.get(courseName)!.push(p)
    }
    // Ordinamento alfabetico, ma "Senza corso" in fondo
    const entries = [...groups.entries()].sort(([a], [b]) => {
      if (a.startsWith("Senza")) return 1
      if (b.startsWith("Senza")) return -1
      return a.localeCompare(b)
    })
    return entries
  }, [showcase.participations])

  const filteredEnrollable = enrollableAthletes.filter(
    (a) =>
      a.firstName.toLowerCase().includes(filter.toLowerCase()) ||
      a.lastName.toLowerCase().includes(filter.toLowerCase()),
  )

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function onEnroll() {
    if (selected.size === 0) {
      toast.error("Seleziona almeno un'allieva")
      return
    }
    startTransition(async () => {
      const res = await createParticipationsBulk({
        showcaseId: showcase.id,
        athleteIds: Array.from(selected),
      })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      const { enrolled, failed } = res.data!
      if (enrolled > 0) toast.success(`${enrolled} aggiunte`)
      if (failed.length > 0) {
        toast.warning(`${failed.length} non aggiunte: ${failed[0].reason}`)
      }
      setSelected(new Set())
      setDialogOpen(false)
      router.refresh()
    })
  }

  function onConfirmAction() {
    if (!confirmTarget) return
    const targetId = confirmTarget.id
    setBusyParticipationId(targetId)
    startTransition(async () => {
      const res = await confirmParticipation({
        participationId: targetId,
        paymentMode,
      })
      setBusyParticipationId(null)
      if (!res.ok) {
        toast.error(res.error)
      } else {
        toast.success("Partecipazione confermata")
        setConfirmTarget(null)
        router.refresh()
      }
    })
  }

  function onUnconfirm(participationId: string) {
    if (
      !confirm(
        "Annullare la conferma? Eventuali scadenze pendenti verranno rimosse.",
      )
    )
      return
    setBusyParticipationId(participationId)
    startTransition(async () => {
      const res = await unconfirmParticipation(participationId)
      setBusyParticipationId(null)
      if (!res.ok) {
        toast.error(res.error)
      } else {
        toast.success("Conferma annullata")
        router.refresh()
      }
    })
  }

  function onDelete(participationId: string) {
    if (!confirm("Rimuovere la partecipazione?")) return
    setBusyParticipationId(participationId)
    startTransition(async () => {
      const res = await deleteParticipation(participationId)
      setBusyParticipationId(null)
      if (!res.ok) {
        toast.error(res.error)
      } else {
        toast.success("Partecipazione rimossa")
        router.refresh()
      }
    })
  }

  const isCancelled = showcase.deletedAt !== null

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Partecipanti</CardTitle>
            <p className="text-sm text-muted-foreground">
              Raggruppati per corso AA corrente
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={isCancelled}>
                <Plus className="h-4 w-4" />
                Aggiungi allieve
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Aggiungi al saggio</DialogTitle>
                <DialogDescription>
                  Le allieve non iscritte a corsi AA corrente sono comunque
                  selezionabili (verrà mostrato un avviso).
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-3">
                <Input
                  placeholder="Cerca allieva…"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
                <div className="max-h-72 overflow-y-auto rounded-md border">
                  {filteredEnrollable.length === 0 ? (
                    <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                      Nessuna allieva disponibile.
                    </p>
                  ) : (
                    <ul className="divide-y">
                      {filteredEnrollable.map((a) => (
                        <li
                          key={a.id}
                          className="flex items-center gap-3 px-3 py-2"
                        >
                          <Checkbox
                            id={`s-${a.id}`}
                            checked={selected.has(a.id)}
                            onCheckedChange={() => toggle(a.id)}
                          />
                          <label
                            htmlFor={`s-${a.id}`}
                            className="flex-1 cursor-pointer text-sm"
                          >
                            <span className="font-medium">
                              {a.lastName} {a.firstName}
                            </span>
                            {a.enrolledInCurrentAY ? (
                              <span className="ml-2 text-xs text-muted-foreground">
                                {a.courses.join(", ")}
                              </span>
                            ) : (
                              <span className="ml-2 text-xs text-amber-600">
                                ⚠ non iscritta a corsi AA
                              </span>
                            )}
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Selezionate: {selected.size}
                </p>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={isPending}
                >
                  Annulla
                </Button>
                <Button onClick={onEnroll} disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Aggiunta…
                    </>
                  ) : (
                    `Aggiungi (${selected.size})`
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {showcase.participations.length === 0 ? (
            <div className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">
              Nessuna partecipante. Usa «Aggiungi allieve» per iniziare.
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {grouped.map(([courseName, participations]) => (
                <div key={courseName} className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium">{courseName}</h3>
                    <Badge variant="outline">{participations.length}</Badge>
                  </div>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Allieva</TableHead>
                          <TableHead>Coreografia</TableHead>
                          <TableHead>Conferma</TableHead>
                          <TableHead>Scadenze</TableHead>
                          <TableHead className="text-right">Azioni</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {participations.map((p) => (
                          <ParticipationRowCmp
                            key={p.id}
                            participation={p}
                            busy={busyParticipationId === p.id}
                            disabled={isPending || isCancelled}
                            onChoreographySaved={() => router.refresh()}
                            onAskConfirm={() => {
                              setConfirmTarget(p)
                              setPaymentMode("SPLIT")
                            }}
                            onUnconfirm={() => onUnconfirm(p.id)}
                            onDelete={() => onDelete(p.id)}
                          />
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={confirmTarget !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmTarget(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Confermare {confirmTarget?.athlete.firstName}{" "}
              {confirmTarget?.athlete.lastName}?
            </DialogTitle>
            <DialogDescription>
              Scegli la modalità di pagamento. Verranno create le scadenze
              corrispondenti.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setPaymentMode("SPLIT")}
              className={`flex items-start gap-3 rounded-md border p-3 text-left transition-colors ${
                paymentMode === "SPLIT"
                  ? "border-foreground bg-accent/30"
                  : "border-border hover:bg-accent/10"
              }`}
            >
              <div
                className={`mt-1 h-4 w-4 rounded-full border-2 ${
                  paymentMode === "SPLIT"
                    ? "border-foreground bg-foreground"
                    : "border-border"
                }`}
              />
              <div className="flex-1">
                <p className="font-medium text-sm">
                  {PAYMENT_MODE_LABELS.SPLIT}
                </p>
                <p className="text-xs text-muted-foreground">
                  2 scadenze separate (caparra{" "}
                  {EUR.format(showcase.firstInstallmentCents / 100)} + saldo{" "}
                  {EUR.format(showcase.secondInstallmentCents / 100)})
                </p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMode("SINGLE")}
              className={`flex items-start gap-3 rounded-md border p-3 text-left transition-colors ${
                paymentMode === "SINGLE"
                  ? "border-foreground bg-accent/30"
                  : "border-border hover:bg-accent/10"
              }`}
            >
              <div
                className={`mt-1 h-4 w-4 rounded-full border-2 ${
                  paymentMode === "SINGLE"
                    ? "border-foreground bg-foreground"
                    : "border-border"
                }`}
              />
              <div className="flex-1">
                <p className="font-medium text-sm">
                  {PAYMENT_MODE_LABELS.SINGLE}
                </p>
                <p className="text-xs text-muted-foreground">
                  1 scadenza unica (
                  {EUR.format(
                    (showcase.firstInstallmentCents +
                      showcase.secondInstallmentCents) /
                      100,
                  )}
                  )
                </p>
              </div>
            </button>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmTarget(null)}
              disabled={isPending}
            >
              Annulla
            </Button>
            <Button onClick={onConfirmAction} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Conferma…
                </>
              ) : (
                "Conferma"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function ParticipationRowCmp({
  participation: p,
  busy,
  disabled,
  onChoreographySaved,
  onAskConfirm,
  onUnconfirm,
  onDelete,
}: {
  participation: ParticipationRow
  busy: boolean
  disabled: boolean
  onChoreographySaved: () => void
  onAskConfirm: () => void
  onUnconfirm: () => void
  onDelete: () => void
}) {
  const [editingChoreo, setEditingChoreo] = useState(false)
  const [choreoValue, setChoreoValue] = useState(p.choreography ?? "")
  const [savingChoreo, setSavingChoreo] = useState(false)

  async function saveChoreo() {
    setSavingChoreo(true)
    const res = await updateChoreography({
      participationId: p.id,
      choreography: choreoValue.trim() || "",
    })
    setSavingChoreo(false)
    if (!res.ok) {
      toast.error(res.error)
    } else {
      toast.success("Coreografia aggiornata")
      setEditingChoreo(false)
      onChoreographySaved()
    }
  }

  const totalCents = p.paymentSchedules.reduce(
    (sum, s) => sum + s.amountCents,
    0,
  )
  const paidCents = p.paymentSchedules
    .filter((s) => s.status === "PAID")
    .reduce((sum, s) => sum + s.amountCents, 0)

  return (
    <TableRow>
      <TableCell className="font-medium">
        <Link
          href={`/admin/athletes/${p.athlete.id}`}
          className="underline-offset-2 hover:underline"
        >
          {p.athlete.lastName} {p.athlete.firstName}
        </Link>
      </TableCell>
      <TableCell className="min-w-[180px]">
        {editingChoreo ? (
          <div className="flex items-center gap-2">
            <Input
              value={choreoValue}
              onChange={(e) => setChoreoValue(e.target.value)}
              placeholder="es. Il lago dei cigni — Act II"
              disabled={savingChoreo}
              className="h-8 text-sm"
              autoFocus
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={saveChoreo}
              disabled={savingChoreo}
            >
              {savingChoreo ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                "Salva"
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditingChoreo(false)
                setChoreoValue(p.choreography ?? "")
              }}
              disabled={savingChoreo}
            >
              ✕
            </Button>
          </div>
        ) : (
          <button
            type="button"
            className="flex items-center gap-2 text-left text-sm hover:underline"
            onClick={() => setEditingChoreo(true)}
            disabled={disabled}
          >
            <span className="text-muted-foreground">
              {p.choreography || "— (clicca per aggiungere)"}
            </span>
            <Pencil className="h-3 w-3 text-muted-foreground" />
          </button>
        )}
      </TableCell>
      <TableCell>
        {p.confirmed ? (
          <div className="flex flex-col gap-1">
            <Badge className="w-fit">
              <CheckCircle2 className="h-3 w-3" />
              Confermata
            </Badge>
            {p.paymentMode ? (
              <span className="text-xs text-muted-foreground">
                {PAYMENT_MODE_LABELS[p.paymentMode]}
              </span>
            ) : null}
          </div>
        ) : (
          <Badge variant="outline">In attesa</Badge>
        )}
      </TableCell>
      <TableCell>
        {p.paymentSchedules.length === 0 ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : (
          <div className="flex flex-col gap-1 text-xs">
            <span className="font-mono">
              {EUR.format(paidCents / 100)} / {EUR.format(totalCents / 100)}
            </span>
            <span className="text-muted-foreground">
              prox.{" "}
              {DATE_IT.format(
                p.paymentSchedules.find((s) => s.status !== "PAID")?.dueDate ??
                  p.paymentSchedules[0].dueDate,
              )}
            </span>
          </div>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          {p.confirmed ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={onUnconfirm}
              disabled={busy || disabled}
              title="Annulla conferma"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={onAskConfirm}
              disabled={busy || disabled}
            >
              Conferma
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={onDelete}
            disabled={busy || disabled}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            title="Rimuovi partecipazione"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}
