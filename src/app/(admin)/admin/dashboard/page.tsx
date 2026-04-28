import Link from "next/link"
import { redirect } from "next/navigation"
import { AlertTriangle } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

import { ResourceContent } from "../_components/resource-content"
import { ResourceHeader } from "../_components/resource-header"

import {
  getDashboardStats,
  getRecentAthletes,
  getRecentParents,
  getScadenzeKPI,
} from "./queries"
import {
  getEnrollmentsTrend,
  getIncomeTrend,
  getPopularCourses,
  getRetentionRate,
} from "./analytics-queries"
import { AnalyticsSection } from "./_components/analytics-section"
import { KpiCards } from "./_components/kpi-cards"
import { RecentActivity } from "./_components/recent-activity"
import { QuickActions } from "./_components/quick-actions"
import { ScadenzeKpiWidget } from "./_components/scadenze-kpi-widget"

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect("/login")
  }

  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  const [
    user,
    stats,
    scadenzeKpi,
    athletes,
    parents,
    enrollmentsTrend,
    incomeTrend,
    popularCourses,
    retention,
    ayCoverage,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: authUser.id },
      select: { firstName: true },
    }),
    getDashboardStats(),
    getScadenzeKPI(),
    getRecentAthletes(5),
    getRecentParents(5),
    getEnrollmentsTrend(12),
    getIncomeTrend(12),
    getPopularCourses(10),
    getRetentionRate(),
    prisma.academicYear.findMany({
      where: {
        startDate: { lte: today },
        endDate: { gte: today },
      },
      select: { id: true, label: true, isCurrent: true },
      orderBy: { startDate: "desc" },
    }),
  ])

  const ayBanner: { kind: "missing" | "mismatch" | "overlap"; details: string } | null =
    ayCoverage.length === 0
      ? { kind: "missing", details: "Nessun anno accademico copre la data odierna." }
      : ayCoverage.length > 1
        ? {
            kind: "overlap",
            details: `Anni sovrapposti oggi: ${ayCoverage.map((y) => y.label).join(", ")}.`,
          }
        : !ayCoverage[0].isCurrent
          ? {
              kind: "mismatch",
              details: `${ayCoverage[0].label} copre la data odierna ma non è impostato come corrente.`,
            }
          : null

  return (
    <>
      <ResourceHeader
        breadcrumbs={[{ label: "Dashboard" }]}
        title={`Ciao ${user?.firstName ?? "Admin"} 👋`}
        description="Ecco un riepilogo della situazione IAD oggi."
      />
      <ResourceContent>
        <div className="flex flex-col gap-6">
          {ayBanner ? (
            <div className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950/30">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" />
              <div className="flex-1 space-y-1">
                <p className="font-semibold text-amber-900 dark:text-amber-100">
                  Anno accademico da verificare
                </p>
                <p className="text-amber-800 dark:text-amber-200">
                  {ayBanner.details} Il rollover automatico viene eseguito ogni
                  notte; puoi intervenire subito da{" "}
                  <Link
                    href="/admin/academic-years"
                    className="font-medium underline underline-offset-4"
                  >
                    Anni accademici
                  </Link>
                  .
                </p>
              </div>
            </div>
          ) : null}
          <ScadenzeKpiWidget kpi={scadenzeKpi} />
          <KpiCards stats={stats} />
          <AnalyticsSection
            enrollmentsTrend={enrollmentsTrend}
            incomeTrend={incomeTrend}
            popularCourses={popularCourses}
            retention={retention}
          />
          <RecentActivity athletes={athletes} parents={parents} />
          <QuickActions />
        </div>
      </ResourceContent>
    </>
  )
}
