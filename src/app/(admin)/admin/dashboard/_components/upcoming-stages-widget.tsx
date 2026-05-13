import Link from "next/link"
import { ArrowRight, Sparkles } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const DATE_IT = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

type UpcomingStage = {
  id: string
  title: string
  date: Date
  startTime: string
  location: string | null
  capacity: number
  registrationOpen: boolean
  _count: { enrollments: number }
}

type Props = {
  stages: UpcomingStage[]
  totalCount: number
}

export function UpcomingStagesWidget({ stages, totalCount }: Props) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-600" />
          <CardTitle className="text-base">Stage prossimi</CardTitle>
        </div>
        <Link
          href="/admin/stages"
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Vedi tutti ({totalCount})
          <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent>
        {stages.length === 0 ? (
          <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
            Nessuno stage in programma.
          </p>
        ) : (
          <ul className="divide-y">
            {stages.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <Link
                  href={`/admin/stages/${s.id}`}
                  className="flex-1 truncate text-sm font-medium underline-offset-2 hover:underline"
                >
                  {s.title}
                </Link>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-xs text-muted-foreground">
                    {DATE_IT.format(s.date)} · {s.startTime}
                  </span>
                  <Badge variant="outline" className="font-mono text-xs">
                    {s._count.enrollments}/{s.capacity}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
