import Link from "next/link"
import { ArrowRight, Star } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const DATE_IT = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

type ExistsStats = {
  exists: true
  id: string
  title: string
  date: Date
  academicYearLabel: string
  totalParticipants: number
  confirmed: number
  pending: number
  paidFirst: number
  paidSecond: number
}

type NotExistsStats = {
  exists: false
  academicYearLabel: string
}

type Props = {
  stats: ExistsStats | NotExistsStats | null
}

export function ShowcaseWidget({ stats }: Props) {
  if (!stats) return null

  if (!stats.exists) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500" />
            Saggio AA {stats.academicYearLabel}
          </CardTitle>
          <Button asChild size="sm" variant="ghost">
            <Link href="/admin/showcase">
              Crea
              <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Nessun saggio configurato per l&apos;AA corrente.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Star className="h-4 w-4 text-amber-500" />
          Saggio AA {stats.academicYearLabel}
        </CardTitle>
        <Button asChild size="sm" variant="ghost">
          <Link href={`/admin/showcase/${stats.id}`}>
            Apri
            <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground line-clamp-1 max-w-[60%]">
            {stats.title}
          </span>
          <Badge variant="outline" className="font-mono">
            {DATE_IT.format(stats.date)}
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-2">
          <Stat label="Partecipanti" value={stats.totalParticipants} />
          <Stat label="Confermate" value={stats.confirmed} accent="ok" />
          <Stat label="In attesa" value={stats.pending} accent="warn" />
          <Stat
            label="Pagamenti"
            value={`${stats.paidFirst}/${stats.paidSecond}`}
            hint="Caparra / Saldo"
          />
        </div>
      </CardContent>
    </Card>
  )
}

function Stat({
  label,
  value,
  hint,
  accent,
}: {
  label: string
  value: number | string
  hint?: string
  accent?: "ok" | "warn"
}) {
  const color =
    accent === "ok"
      ? "text-emerald-600"
      : accent === "warn"
        ? "text-amber-600"
        : "text-foreground"
  return (
    <div className="rounded-md border bg-muted/20 p-2">
      <p className={`text-lg font-mono font-medium ${color}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {hint ? (
        <p className="text-[10px] text-muted-foreground/60">{hint}</p>
      ) : null}
    </div>
  )
}
