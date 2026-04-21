import { UserCheck } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import type { RetentionData } from "../../analytics-queries"

interface RetentionKPIProps {
  data: RetentionData
}

function rateColor(ratePercent: number): string {
  if (ratePercent >= 70)
    return "text-emerald-600 dark:text-emerald-500"
  if (ratePercent >= 50) return "text-amber-600 dark:text-amber-500"
  return "text-rose-600 dark:text-rose-500"
}

export function RetentionKPI({ data }: RetentionKPIProps) {
  const hasHistory =
    data.previousYearLabel !== null && data.previousYearAthletes > 0
  const color = rateColor(data.ratePercent)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserCheck className="h-4 w-4 text-muted-foreground" />
          Retention anno su anno
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-4">
        {hasHistory ? (
          <>
            <p className={`font-mono text-4xl font-semibold ${color}`}>
              {data.ratePercent.toFixed(1)}%
            </p>
            <div className="flex flex-col gap-1 text-xs text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">
                  {data.rematriculated}
                </span>{" "}
                allieve rinnovate su{" "}
                <span className="font-medium text-foreground">
                  {data.previousYearAthletes}
                </span>{" "}
                dell&apos;anno {data.previousYearLabel}
              </p>
              <p>
                Anno corrente{" "}
                <span className="font-medium text-foreground">
                  {data.currentYearLabel}
                </span>{" "}
                · {data.currentYearAthletes} allieve iscritte
              </p>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              Dato non disponibile.
            </p>
            <p className="text-xs text-muted-foreground">
              Servono almeno due anni accademici con iscrizioni per
              calcolare la retention.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
