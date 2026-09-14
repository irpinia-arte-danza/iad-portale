import Link from "next/link"
import { redirect } from "next/navigation"
import { AlertTriangle, ArrowRight, Stethoscope } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import {
  fiscalYearOf,
  isNextFiscalYearDue,
  isSchoolYearStarted,
  upcomingAcademicYearLabel,
} from "@/lib/school-calendar"
import { todayDateOnly } from "@/lib/utils/date-only"

import { ResourceContent } from "../_components/resource-content"
import { ResourceHeader } from "../_components/resource-header"
import { getCertificateStatusCounts } from "../medical-certificates/queries"

import {
  countUpcomingStages,
  getCurrentShowcaseStats,
  getDashboardStats,
  getRecentAthletes,
  getRecentParents,
  getScadenzeKPI,
  getUpcomingStages,
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
import { ShowcaseWidget } from "./_components/showcase-widget"
import { UpcomingStagesWidget } from "./_components/upcoming-stages-widget"

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect("/login")
  }

  const today = todayDateOnly()
  const upcomingAyLabel = upcomingAcademicYearLabel(today)
  const fiscalYearNow = fiscalYearOf(today)

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
    academicYears,
    fiscalYears,
    certCounts,
    upcomingStages,
    upcomingStagesCount,
    showcaseStats,
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
        OR: [
          { startDate: { lte: today }, endDate: { gte: today } },
          { isCurrent: true },
          ...(upcomingAyLabel ? [{ label: upcomingAyLabel }] : []),
        ],
      },
      select: {
        id: true,
        label: true,
        isCurrent: true,
        startDate: true,
        endDate: true,
      },
      orderBy: { startDate: "desc" },
    }),
    prisma.fiscalYear.findMany({
      where: { year: { in: [fiscalYearNow, fiscalYearNow + 1] } },
      select: { year: true, isCurrent: true },
    }),
    getCertificateStatusCounts(),
    getUpcomingStages(3),
    countUpcomingStages(),
    getCurrentShowcaseStats(),
  ])

  const certNeedsAttention =
    certCounts.expired + certCounts.expiring + certCounts.missing
  const certHasExpired = certCounts.expired > 0
  const certPalette = certHasExpired
    ? {
        wrap: "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30",
        title: "text-red-900 dark:text-red-100",
        text: "text-red-800 dark:text-red-200",
        icon: "text-red-700 dark:text-red-300",
      }
    : {
        wrap: "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30",
        title: "text-amber-900 dark:text-amber-100",
        text: "text-amber-800 dark:text-amber-200",
        icon: "text-amber-700 dark:text-amber-300",
      }
  const certDeepLink = certHasExpired
    ? "/admin/medical-certificates?status=expired"
    : certCounts.expiring > 0
      ? "/admin/medical-certificates?status=expiring"
      : "/admin/medical-certificates?status=missing"

  // Luglio-agosto nessun anno copre la data odierna: il corrente resta l'anno
  // appena concluso fino all'avvio del successivo, non è un'anomalia.
  const ayCoverage = academicYears.filter(
    (y) => y.startDate <= today && y.endDate >= today,
  )
  const hasCurrentAy = academicYears.some((y) => y.isCurrent)
  const upcomingAyMissing =
    upcomingAyLabel !== null &&
    !academicYears.some((y) => y.label === upcomingAyLabel)

  const ayBanner: string | null =
    ayCoverage.length > 1
      ? `Anni sovrapposti oggi: ${ayCoverage.map((y) => y.label).join(", ")}.`
      : ayCoverage.length === 1 && !ayCoverage[0].isCurrent
        ? `${ayCoverage[0].label} copre la data odierna ma non è impostato come corrente: il cambio automatico avviene ogni notte.`
        : upcomingAyMissing
          ? isSchoolYearStarted(today)
            ? `L'anno accademico ${upcomingAyLabel} non è ancora stato creato e settembre è già iniziato: crealo subito.`
            : `L'anno accademico ${upcomingAyLabel} non è ancora stato creato: crealo prima del 1° settembre.`
          : !hasCurrentAy
            ? "Nessun anno accademico è impostato come corrente."
            : null

  const currentFiscalYear = fiscalYears.find((f) => f.year === fiscalYearNow)
  const fyBanner: string | null = !currentFiscalYear?.isCurrent
    ? `L'anno fiscale ${fiscalYearNow} non è ancora attivo.`
    : isNextFiscalYearDue(today) &&
        !fiscalYears.some((f) => f.year === fiscalYearNow + 1)
      ? `L'anno fiscale ${fiscalYearNow + 1} non è ancora stato preparato.`
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
                  {ayBanner} Puoi intervenire da{" "}
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
          {fyBanner ? (
            <div className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950/30">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" />
              <div className="flex-1 space-y-1">
                <p className="font-semibold text-amber-900 dark:text-amber-100">
                  Anno fiscale da verificare
                </p>
                <p className="text-amber-800 dark:text-amber-200">
                  {fyBanner} Il portale lo crea in automatico ogni notte: se
                  l&apos;avviso resta visibile anche domani, segnalalo a chi
                  gestisce il portale. Pagamenti e spese vengono comunque
                  assegnati all&apos;anno fiscale della loro data.
                </p>
              </div>
            </div>
          ) : null}
          {certNeedsAttention > 0 ? (
            <div
              className={`flex items-start gap-3 rounded-md border p-4 text-sm ${certPalette.wrap}`}
            >
              <Stethoscope
                className={`mt-0.5 h-5 w-5 shrink-0 ${certPalette.icon}`}
              />
              <div className="flex-1 space-y-1">
                <p className={`font-semibold ${certPalette.title}`}>
                  Certificati medici da gestire
                </p>
                <p className={certPalette.text}>
                  {[
                    certCounts.expired > 0
                      ? `${certCounts.expired} scaduti`
                      : null,
                    certCounts.expiring > 0
                      ? `${certCounts.expiring} in scadenza`
                      : null,
                    certCounts.missing > 0
                      ? `${certCounts.missing} mancanti`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  .
                </p>
              </div>
              <Link
                href={certDeepLink}
                className={`flex shrink-0 items-center gap-1 text-xs font-medium underline underline-offset-4 ${certPalette.title}`}
              >
                Vai
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          ) : null}
          <ScadenzeKpiWidget kpi={scadenzeKpi} />
          <KpiCards stats={stats} />
          <div className="grid gap-4 md:grid-cols-2">
            <UpcomingStagesWidget
              stages={upcomingStages}
              totalCount={upcomingStagesCount}
            />
            <ShowcaseWidget stats={showcaseStats} />
          </div>
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
