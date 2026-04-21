import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import type {
  EnrollmentsTrendPoint,
  IncomeTrendPoint,
  PopularCourseEntry,
  RetentionData,
} from "../analytics-queries"

import { EnrollmentsTrendChart } from "./charts/enrollments-trend-chart"
import { IncomeTrendChart } from "./charts/income-trend-chart"
import { PopularCoursesChart } from "./charts/popular-courses-chart"
import { RetentionKPI } from "./charts/retention-kpi"

interface AnalyticsSectionProps {
  enrollmentsTrend: EnrollmentsTrendPoint[]
  incomeTrend: IncomeTrendPoint[]
  popularCourses: PopularCourseEntry[]
  retention: RetentionData
}

export function AnalyticsSection({
  enrollmentsTrend,
  incomeTrend,
  popularCourses,
  retention,
}: AnalyticsSectionProps) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Andamento</h2>
        <p className="text-sm text-muted-foreground">
          Ultimi 12 mesi · Corsi e retention sull&apos;anno accademico
          corrente.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Iscrizioni per mese</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <EnrollmentsTrendChart data={enrollmentsTrend} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Incassi per mese</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <IncomeTrendChart data={incomeTrend} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              Corsi più popolari (anno corrente)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <PopularCoursesChart data={popularCourses} />
          </CardContent>
        </Card>
        <RetentionKPI data={retention} />
      </div>
    </section>
  )
}
