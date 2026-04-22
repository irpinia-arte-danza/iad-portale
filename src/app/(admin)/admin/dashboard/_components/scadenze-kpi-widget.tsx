import Link from "next/link"
import { ArrowRight, AlertCircle, Clock, Mail } from "lucide-react"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatEur } from "@/lib/utils/format"

import type { ScadenzeKPI } from "../queries"

interface ScadenzeKpiWidgetProps {
  kpi: ScadenzeKPI
}

export function ScadenzeKpiWidget({ kpi }: ScadenzeKpiWidgetProps) {
  const isEmpty = kpi.total.count === 0

  return (
    <Card className={isEmpty ? undefined : "border-destructive/30"}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Mail className="h-5 w-5 text-muted-foreground" />
          Scadenze aperte
        </CardTitle>
        <Link
          href="/admin/scadenze"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Gestisci scadenze
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <span className="text-2xl">✨</span>
            <p className="mt-2 text-sm font-medium">
              Nessuna scadenza aperta
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Tutte le quote sono saldate o future.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-start gap-3 rounded-md border border-destructive/20 bg-destructive/5 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground">
                  In ritardo
                </p>
                <p className="mt-1 text-2xl font-bold text-destructive">
                  {kpi.inRitardo.count}
                </p>
                <p className="mt-0.5 font-mono text-sm text-muted-foreground">
                  {formatEur(kpi.inRitardo.amountCents)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
              <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-500" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground">
                  In scadenza 7 giorni
                </p>
                <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-500">
                  {kpi.inScadenza7gg.count}
                </p>
                <p className="mt-0.5 font-mono text-sm text-muted-foreground">
                  {formatEur(kpi.inScadenza7gg.amountCents)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-md border bg-muted/30 p-3">
              <div className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Totale aperte
                </p>
                <p className="mt-1 text-2xl font-bold">{kpi.total.count}</p>
                <p className="mt-0.5 font-mono text-sm text-muted-foreground">
                  {formatEur(kpi.total.amountCents)}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
