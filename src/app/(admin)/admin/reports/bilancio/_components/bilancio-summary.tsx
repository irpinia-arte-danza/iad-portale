import { TrendingDown, TrendingUp, Wallet } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { managementResult } from "@/lib/bilancio/result"
import { formatEuro } from "@/lib/utils/format"

import type { BilancioTotals } from "../queries"

interface BilancioSummaryProps {
  totals: BilancioTotals
}

export function BilancioSummary({ totals }: BilancioSummaryProps) {
  const result = managementResult(totals.netCents)

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card>
        <CardContent className="flex flex-col gap-1 px-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
            Entrate
          </div>
          <p className="font-mono text-2xl font-semibold">
            {formatEuro(totals.entrateCents)}
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
            {/* Un'uscita non è un problema, è il mestiere: niente rosso,
                il segno meno dice già che esce */}
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
            Uscite
          </div>
          <p className="font-mono text-2xl font-semibold">
            −{formatEuro(totals.usciteCents)}
          </p>
          <p className="text-xs text-muted-foreground">
            {totals.countUscite}{" "}
            {totals.countUscite === 1 ? "movimento" : "movimenti"}
          </p>
        </CardContent>
      </Card>

      {/* Avanzo o disavanzo di gestione: un'ASD non ha un "saldo netto" né
          un margine percentuale. Con il disavanzo l'importo è senza segno,
          lo dice già la parola. */}
      <Card>
        <CardContent className="flex flex-col gap-1 px-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            {result.label}
          </div>
          <p
            className={`font-mono text-2xl font-semibold ${
              result.isDeficit
                ? "text-rose-600 dark:text-rose-500"
                : "text-emerald-600 dark:text-emerald-500"
            }`}
          >
            {formatEuro(result.amountCents)}
          </p>
          <p className="text-xs text-muted-foreground">Entrate − Uscite</p>
        </CardContent>
      </Card>
    </div>
  )
}
