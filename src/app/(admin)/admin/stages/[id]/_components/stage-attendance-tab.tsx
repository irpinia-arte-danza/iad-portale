"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2, X } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { STAGE_ATTENDANCE_LABELS } from "@/lib/schemas/stage"
import { markAttendance } from "../../actions"
import type { StageWithDetails } from "../../queries"

type AttendanceStatus = "PRESENT" | "ABSENT" | "N_A"

type Props = {
  stage: StageWithDetails
}

export function StageAttendanceTab({ stage }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const initial = useMemo(
    () =>
      new Map(
        stage.enrollments.map((e) => [
          e.id,
          (e.attendance as AttendanceStatus | null) ?? null,
        ]),
      ),
    [stage.enrollments],
  )
  const [marks, setMarks] = useState<Map<string, AttendanceStatus | null>>(
    initial,
  )

  const dirty = useMemo(() => {
    for (const [k, v] of marks) {
      if (initial.get(k) !== v) return true
    }
    return false
  }, [marks, initial])

  function setStatus(enrollmentId: string, status: AttendanceStatus | null) {
    setMarks((prev) => {
      const next = new Map(prev)
      next.set(enrollmentId, status)
      return next
    })
  }

  function bulkSet(status: AttendanceStatus) {
    setMarks((prev) => {
      const next = new Map(prev)
      for (const e of stage.enrollments) {
        next.set(e.id, status)
      }
      return next
    })
  }

  function onSave() {
    const payload = Array.from(marks.entries()).map(([enrollmentId, status]) => ({
      enrollmentId,
      status,
    }))
    startTransition(async () => {
      const res = await markAttendance({ stageId: stage.id, marks: payload })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success(`${res.data?.updated ?? 0} presenze aggiornate`)
      router.refresh()
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Presenze</CardTitle>
          <p className="text-sm text-muted-foreground">
            Segna chi era presente allo stage del{" "}
            {new Intl.DateTimeFormat("it-IT", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            }).format(stage.date)}
            .
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={stage.enrollments.length === 0}
            onClick={() => bulkSet("PRESENT")}
          >
            <Check className="h-4 w-4 text-green-600" />
            Tutti presenti
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={stage.enrollments.length === 0}
            onClick={() => bulkSet("ABSENT")}
          >
            <X className="h-4 w-4 text-red-600" />
            Tutti assenti
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {stage.enrollments.length === 0 ? (
          <div className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">
            Nessuna iscritta da segnare.
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Allieva</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="w-44">Segna</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stage.enrollments.map((e) => {
                  const current = marks.get(e.id) ?? null
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">
                        {e.athlete.lastName} {e.athlete.firstName}
                      </TableCell>
                      <TableCell>
                        {current === "PRESENT" ? (
                          <Badge className="bg-green-600 hover:bg-green-700">
                            Presente
                          </Badge>
                        ) : current === "ABSENT" ? (
                          <Badge variant="destructive">Assente</Badge>
                        ) : current === "N_A" ? (
                          <Badge variant="secondary">N/A</Badge>
                        ) : (
                          <Badge variant="outline">Non segnata</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={current ?? ""}
                          onValueChange={(v) =>
                            setStatus(
                              e.id,
                              v === ""
                                ? null
                                : (v as AttendanceStatus),
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PRESENT">
                              {STAGE_ATTENDANCE_LABELS.PRESENT}
                            </SelectItem>
                            <SelectItem value="ABSENT">
                              {STAGE_ATTENDANCE_LABELS.ABSENT}
                            </SelectItem>
                            <SelectItem value="N_A">
                              {STAGE_ATTENDANCE_LABELS.N_A}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <Button onClick={onSave} disabled={!dirty || isPending}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvataggio…
              </>
            ) : (
              "Salva presenze"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
