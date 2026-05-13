"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

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

import { enrollAthletesBulk, unenrollAthlete } from "../../actions"
import type { StageWithDetails } from "../../queries"

const DATE_IT = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

const CURRENCY_IT = new Intl.NumberFormat("it-IT", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

type EnrollableAthlete = { id: string; firstName: string; lastName: string }

type Props = {
  stage: StageWithDetails
  enrollableAthletes: EnrollableAthlete[]
  canEnroll: boolean
  enrollmentBlockReason?: string
}

export function StageRosterTab({
  stage,
  enrollableAthletes,
  canEnroll,
  enrollmentBlockReason,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [unenrollingId, setUnenrollingId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState("")

  const filtered = enrollableAthletes.filter(
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
      const res = await enrollAthletesBulk({
        stageId: stage.id,
        athleteIds: Array.from(selected),
      })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      const { enrolled, failed } = res.data!
      if (enrolled > 0) toast.success(`${enrolled} iscritte`)
      if (failed.length > 0) {
        toast.warning(`${failed.length} non iscritte: ${failed[0].reason}`)
      }
      setSelected(new Set())
      setDialogOpen(false)
      router.refresh()
    })
  }

  function onUnenroll(enrollmentId: string) {
    if (!confirm("Rimuovere l'iscrizione?")) return
    setUnenrollingId(enrollmentId)
    startTransition(async () => {
      const res = await unenrollAthlete(enrollmentId)
      setUnenrollingId(null)
      if (!res.ok) {
        toast.error(res.error)
      } else {
        toast.success("Iscrizione rimossa")
        router.refresh()
      }
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Iscritte</CardTitle>
          <p className="text-sm text-muted-foreground">
            {stage.enrollments.length}/{stage.capacity} posti occupati
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={!canEnroll}>
              <Plus className="h-4 w-4" />
              Iscrivi allieve
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Iscrivi allieve</DialogTitle>
              <DialogDescription>
                Seleziona una o più allieve attive da iscrivere a questo
                stage. Verrà creata una scadenza pagamento per ciascuna.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <Input
                placeholder="Cerca allieva…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
              <div className="max-h-72 overflow-y-auto rounded-md border">
                {filtered.length === 0 ? (
                  <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                    Nessuna allieva disponibile.
                  </p>
                ) : (
                  <ul className="divide-y">
                    {filtered.map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center gap-3 px-3 py-2"
                      >
                        <Checkbox
                          id={`a-${a.id}`}
                          checked={selected.has(a.id)}
                          onCheckedChange={() => toggle(a.id)}
                        />
                        <label
                          htmlFor={`a-${a.id}`}
                          className="flex-1 cursor-pointer text-sm"
                        >
                          {a.lastName} {a.firstName}
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
                    Iscrizione…
                  </>
                ) : (
                  `Iscrivi (${selected.size})`
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {!canEnroll && enrollmentBlockReason && (
          <p className="mb-3 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            {enrollmentBlockReason}
          </p>
        )}
        {stage.enrollments.length === 0 ? (
          <div className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">
            Nessuna allieva iscritta.
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Allieva</TableHead>
                  <TableHead>Genitore</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Scadenza</TableHead>
                  <TableHead className="text-right">Importo</TableHead>
                  <TableHead className="text-right">Azione</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stage.enrollments.map((e) => {
                  const parent = e.athlete.parentRelations[0]?.parent ?? null
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/admin/athletes/${e.athlete.id}`}
                          className="underline-offset-2 hover:underline"
                        >
                          {e.athlete.lastName} {e.athlete.firstName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">
                        {parent
                          ? `${parent.lastName} ${parent.firstName}`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {e.paid ? (
                          <Badge>Pagato</Badge>
                        ) : e.paymentSchedule ? (
                          <Badge variant="outline">In sospeso</Badge>
                        ) : (
                          <Badge variant="secondary">—</Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {e.paymentSchedule
                          ? DATE_IT.format(e.paymentSchedule.dueDate)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        €{" "}
                        {CURRENCY_IT.format(
                          (e.paymentSchedule?.amountCents ?? stage.feeCents) /
                            100,
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={
                            isPending ||
                            e.paid ||
                            e.attendance !== null ||
                            unenrollingId === e.id
                          }
                          onClick={() => onUnenroll(e.id)}
                          title={
                            e.paid
                              ? "Pagamento già registrato"
                              : e.attendance !== null
                                ? "Presenze già segnate"
                                : "Rimuovi iscrizione"
                          }
                        >
                          {unenrollingId === e.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
