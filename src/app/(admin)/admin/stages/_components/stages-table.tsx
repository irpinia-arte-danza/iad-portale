"use client"

import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import type { StageListItem } from "../queries"

const DATE_IT = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

const CURRENCY_IT = new Intl.NumberFormat("it-IT", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

type Status = "UPCOMING" | "PAST" | "CANCELLED"

function statusOf(stage: StageListItem): Status {
  if (stage.deletedAt) return "CANCELLED"
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(stage.date)
  d.setHours(0, 0, 0, 0)
  if (d < today) return "PAST"
  return "UPCOMING"
}

const STATUS_LABEL: Record<Status, string> = {
  UPCOMING: "In arrivo",
  PAST: "Concluso",
  CANCELLED: "Cancellato",
}

const STATUS_VARIANT: Record<Status, "default" | "secondary" | "destructive" | "outline"> = {
  UPCOMING: "default",
  PAST: "secondary",
  CANCELLED: "destructive",
}

export function StagesTable({ stages }: { stages: StageListItem[] }) {
  if (stages.length === 0) {
    return (
      <div className="rounded-md border border-dashed py-16 text-center text-sm text-muted-foreground">
        Nessuno stage ancora creato. Clicca «Nuovo stage» per iniziare.
      </div>
    )
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Titolo</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Orario</TableHead>
            <TableHead>Luogo</TableHead>
            <TableHead className="text-right">Iscritti</TableHead>
            <TableHead className="text-right">Quota</TableHead>
            <TableHead>Stato</TableHead>
            <TableHead>Iscrizioni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stages.map((s) => {
            const st = statusOf(s)
            return (
              <TableRow key={s.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/admin/stages/${s.id}`}
                    className="underline-offset-2 hover:underline"
                  >
                    {s.title}
                  </Link>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {DATE_IT.format(s.date)}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {s.startTime}–{s.endTime}
                </TableCell>
                <TableCell className="text-sm">
                  {s.location ?? "—"}
                </TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {s.enrolledCount}/{s.capacity}
                </TableCell>
                <TableCell className="text-right font-mono text-xs">
                  € {CURRENCY_IT.format(s.feeCents / 100)}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[st]}>
                    {STATUS_LABEL[st]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {st === "CANCELLED" ? (
                    <Badge variant="outline">—</Badge>
                  ) : s.registrationOpen ? (
                    <Badge variant="outline">Aperte</Badge>
                  ) : (
                    <Badge variant="secondary">Chiuse</Badge>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
