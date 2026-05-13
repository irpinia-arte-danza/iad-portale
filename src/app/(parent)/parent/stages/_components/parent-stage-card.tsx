"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Calendar, Clock, Loader2, MapPin, UserPlus } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
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

import type { ParentStageItem } from "../../_actions/stages"
import { parentEnrollAthletesInStage } from "../../_actions/stage-actions"

const DATE_IT = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "long",
  year: "numeric",
})

const CURRENCY_IT = new Intl.NumberFormat("it-IT", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

type Props = {
  stage: ParentStageItem
}

export function ParentStageCard({ stage }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const enrollable = stage.myAthletes.filter((a) => !a.alreadyEnrolled)
  const alreadyEnrolled = stage.myAthletes.filter((a) => a.alreadyEnrolled)
  const spotsLeft = Math.max(0, stage.capacity - stage.enrolledCount)
  const full = spotsLeft <= 0

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function onSubmit() {
    if (selected.size === 0) {
      toast.error("Seleziona almeno una figlia")
      return
    }
    startTransition(async () => {
      const res = await parentEnrollAthletesInStage({
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
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold leading-tight">
            {stage.title}
          </h3>
          {full ? (
            <Badge variant="destructive" className="shrink-0">
              Esaurito
            </Badge>
          ) : (
            <Badge variant="outline" className="shrink-0 font-mono text-xs">
              {spotsLeft} posti
            </Badge>
          )}
        </div>
        {stage.description && (
          <p className="text-sm text-muted-foreground">{stage.description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-1.5 text-sm">
          <li className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4 shrink-0" />
            <span>{DATE_IT.format(stage.date)}</span>
          </li>
          <li className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4 shrink-0" />
            <span>
              {stage.startTime}–{stage.endTime}
            </span>
          </li>
          {stage.location && (
            <li className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" />
              <span>{stage.location}</span>
            </li>
          )}
        </ul>

        <div className="rounded-md border bg-muted/30 p-3 text-sm">
          <span className="text-muted-foreground">Quota:</span>{" "}
          <strong className="font-mono tabular-nums">
            € {CURRENCY_IT.format(stage.feeCents / 100)}
          </strong>
          {stage.registrationDeadline && (
            <p className="mt-1 text-xs text-muted-foreground">
              Iscrizioni entro il{" "}
              {DATE_IT.format(stage.registrationDeadline)}
            </p>
          )}
        </div>

        {alreadyEnrolled.length > 0 && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
            Già iscritte:{" "}
            {alreadyEnrolled
              .map((a) => `${a.firstName}${a.paid ? " (pagato)" : ""}`)
              .join(", ")}
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              className="w-full"
              disabled={enrollable.length === 0 || full}
            >
              <UserPlus className="h-4 w-4" />
              Iscrivi le mie figlie
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Iscrivi a «{stage.title}»</DialogTitle>
              <DialogDescription>
                Seleziona le figlie da iscrivere. Verrà creata una scadenza
                pagamento di € {CURRENCY_IT.format(stage.feeCents / 100)} per
                ciascuna.
              </DialogDescription>
            </DialogHeader>
            <ul className="divide-y rounded-md border">
              {enrollable.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center gap-3 px-3 py-2"
                >
                  <Checkbox
                    id={`p-a-${stage.id}-${a.id}`}
                    checked={selected.has(a.id)}
                    onCheckedChange={() => toggle(a.id)}
                  />
                  <label
                    htmlFor={`p-a-${stage.id}-${a.id}`}
                    className="cursor-pointer text-sm"
                  >
                    {a.firstName} {a.lastName}
                  </label>
                </li>
              ))}
            </ul>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Annulla
              </Button>
              <Button onClick={onSubmit} disabled={isPending}>
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
      </CardContent>
    </Card>
  )
}
