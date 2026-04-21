"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type RecentAthlete = {
  id: string
  firstName: string
  lastName: string
  createdAt: Date
  status: "TRIAL" | "ACTIVE" | "SUSPENDED" | "WITHDRAWN"
}

type RecentParent = {
  id: string
  firstName: string
  lastName: string
  createdAt: Date
  _count: { athleteRelations: number }
}

interface RecentActivityProps {
  athletes: RecentAthlete[]
  parents: RecentParent[]
}

const STATUS_LABELS: Record<RecentAthlete["status"], string> = {
  TRIAL: "Prova",
  ACTIVE: "Attiva",
  SUSPENDED: "Sospesa",
  WITHDRAWN: "Ritirata",
}

const STATUS_VARIANTS: Record<
  RecentAthlete["status"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  TRIAL: "secondary",
  ACTIVE: "default",
  SUSPENDED: "outline",
  WITHDRAWN: "destructive",
}

function formatRelativeDate(date: Date): string {
  const now = Date.now()
  const diffMs = now - new Date(date).getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "oggi"
  if (diffDays === 1) return "ieri"
  if (diffDays < 7) return `${diffDays} giorni fa`
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return weeks === 1 ? "1 settimana fa" : `${weeks} settimane fa`
  }
  const months = Math.floor(diffDays / 30)
  return months === 1 ? "1 mese fa" : `${months} mesi fa`
}

export function RecentActivity({ athletes, parents }: RecentActivityProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Ultime allieve aggiunte</CardTitle>
          <CardDescription>Le 5 iscrizioni più recenti</CardDescription>
        </CardHeader>
        <CardContent>
          {athletes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nessuna allieva ancora aggiunta.
            </p>
          ) : (
            <ul className="space-y-3">
              {athletes.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/admin/athletes/${a.id}`}
                    className="flex items-center justify-between gap-2 text-sm hover:text-foreground/80"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="font-medium truncate">
                        {a.lastName} {a.firstName}
                      </span>
                      <Badge
                        variant={STATUS_VARIANTS[a.status]}
                        className="shrink-0"
                      >
                        {STATUS_LABELS[a.status]}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatRelativeDate(a.createdAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/admin/athletes"
            className="mt-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            Vedi tutte le allieve
            <ArrowRight className="h-3 w-3" />
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ultimi genitori aggiunti</CardTitle>
          <CardDescription>Le 5 registrazioni più recenti</CardDescription>
        </CardHeader>
        <CardContent>
          {parents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nessun genitore ancora registrato.
            </p>
          ) : (
            <ul className="space-y-3">
              {parents.map((p) => (
                <li key={p.id}>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="font-medium truncate">
                        {p.lastName} {p.firstName}
                      </span>
                      {p._count.athleteRelations > 0 && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {p._count.athleteRelations}{" "}
                          {p._count.athleteRelations === 1
                            ? "allieva"
                            : "allieve"}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatRelativeDate(p.createdAt)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/admin/parents"
            className="mt-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            Vedi tutti i genitori
            <ArrowRight className="h-3 w-3" />
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
