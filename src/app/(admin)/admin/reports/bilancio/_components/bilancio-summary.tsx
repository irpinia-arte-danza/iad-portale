import { Percent, TrendingDown, TrendingUp, Wallet } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { formatEur, formatPercent } from "@/lib/utils/format"

import type { BilancioTotals } from "../queries"

interface BilancioSummaryProps {
  totals: BilancioTotals
}

export function BilancioSummary({ totals }: BilancioSummaryProps) {
  const netPositive = totals.netCents >= 0

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="flex flex-col gap-1 px-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
            Entrate
          </div>
          <p className="font-mono text-2xl font-semibold">
            {formatEur(totals.entrateCents)}
          </p>
          <p className="text-xs text-muted-foreground">
            {totals.countEntrate}{" "}
            {totals.countEntrate === 1 ? "pagamento" : "pagamenti"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-1 px-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <TrendingDown className="h-4 w-4 text-rose-600 dark:text-rose-500" />
            Uscite
          </div>
          <p className="font-mono text-2xl font-semibold">
            {formatEur(totals.usciteCents)}
          </p>
          <p className="text-xs text-muted-foreground">
            {totals.countUscite}{" "}
            {totals.countUscite === 1 ? "movimento" : "movimenti"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-1 px-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            Saldo netto
          </div>
          <p
            className={`font-mono text-2xl font-semibold ${
              netPositive
                ? "text-emerald-600 dark:text-emerald-500"
                : "text-rose-600 dark:text-rose-500"
            }`}
          >
            {formatEur(totals.netCents)}
          </p>
          <p className="text-xs text-muted-foreground">Entrate − Uscite</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-1 px-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <Percent className="h-4 w-4 text-muted-foreground" />
            Margine
          </div>
          <p
            className={`font-mono text-2xl font-semibold ${
              netPositive
                ? "text-emerald-600 dark:text-emerald-500"
                : "text-rose-600 dark:text-rose-500"
            }`}
          >
            {formatPercent(totals.marginPercent)}
          </p>
          <p className="text-xs text-muted-foreground">
            Saldo netto / Entrate
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
