import { notFound } from "next/navigation"

import { Badge } from "@/components/ui/badge"

import { ResourceContent } from "../../_components/resource-content"
import { ResourceHeader } from "../../_components/resource-header"

import {
  getStageById,
  getStageEmailLogs,
  listStageEnrollableAthletes,
} from "../queries"
import { StageAttendanceTab } from "./_components/stage-attendance-tab"
import { StageEmailTab } from "./_components/stage-email-tab"
import { StageInfoTab } from "./_components/stage-info-tab"
import { StageRosterTab } from "./_components/stage-roster-tab"
import { StageTabsNav } from "./_components/stage-tabs-nav"

export const dynamic = "force-dynamic"

const DATE_IT = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

type SearchParams = Promise<{ tab?: string }>
type Params = Promise<{ id: string }>

function startOfUTCToday(): Date {
  const now = new Date()
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  )
}

function startOfUTCDate(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  )
}

export default async function StageDetailPage({
  params,
  searchParams,
}: {
  params: Params
  searchParams: SearchParams
}) {
  const { id } = await params
  const sp = await searchParams
  const stage = await getStageById(id)
  if (!stage) notFound()

  const today = startOfUTCToday()
  const stageMid = startOfUTCDate(stage.date)
  const isPast = stageMid <= today
  const isCancelled = stage.deletedAt !== null

  const validTabs = ["info", "roster", "presenze", "email"] as const
  type TabKey = (typeof validTabs)[number]
  const activeTab: TabKey = (
    sp.tab && (validTabs as readonly string[]).includes(sp.tab)
      ? sp.tab
      : "info"
  ) as TabKey

  const [enrollableAthletes, emailLogs] = await Promise.all([
    listStageEnrollableAthletes(id),
    getStageEmailLogs(id),
  ])

  // Reason perché non si può iscrivere
  let enrollmentBlockReason: string | undefined
  let canEnroll = true
  if (isCancelled) {
    canEnroll = false
    enrollmentBlockReason = "Stage cancellato."
  } else if (!stage.registrationOpen) {
    canEnroll = false
    enrollmentBlockReason = "Iscrizioni chiuse."
  } else if (stageMid < today) {
    canEnroll = false
    enrollmentBlockReason = "Stage già concluso."
  } else if (
    stage.registrationDeadline &&
    startOfUTCDate(stage.registrationDeadline) < today
  ) {
    canEnroll = false
    enrollmentBlockReason = "Scadenza iscrizioni superata."
  } else if (stage.enrollments.length >= stage.capacity) {
    canEnroll = false
    enrollmentBlockReason = "Posti esauriti."
  }

  return (
    <>
      <ResourceHeader
        breadcrumbs={[
          { label: "Stage", href: "/admin/stages" },
          { label: stage.title },
        ]}
        title={stage.title}
        description={`${DATE_IT.format(stage.date)} · ${stage.startTime}–${stage.endTime} · ${stage.location ?? "luogo non specificato"}`}
        action={
          <div className="flex items-center gap-2">
            {isCancelled ? (
              <Badge variant="destructive">Cancellato</Badge>
            ) : isPast ? (
              <Badge variant="secondary">Concluso</Badge>
            ) : (
              <Badge>In arrivo</Badge>
            )}
            <Badge variant="outline">
              AA {stage.academicYear.label}
            </Badge>
          </div>
        }
      />
      <ResourceContent>
        <div className="flex flex-col gap-6">
          <StageTabsNav
            basePath={`/admin/stages/${stage.id}`}
            activeKey={activeTab}
            tabs={[
              { key: "info", label: "Info" },
              { key: "roster", label: `Roster (${stage.enrollments.length})` },
              {
                key: "presenze",
                label: "Presenze",
                disabled: !isPast,
              },
              { key: "email", label: "Email" },
            ]}
          />

          {activeTab === "info" && <StageInfoTab stage={stage} />}
          {activeTab === "roster" && (
            <StageRosterTab
              stage={stage}
              enrollableAthletes={enrollableAthletes}
              canEnroll={canEnroll}
              enrollmentBlockReason={enrollmentBlockReason}
            />
          )}
          {activeTab === "presenze" && (
            <StageAttendanceTab stage={stage} />
          )}
          {activeTab === "email" && (
            <StageEmailTab
              stageId={stage.id}
              stageTitle={stage.title}
              logs={emailLogs}
            />
          )}
        </div>
      </ResourceContent>
    </>
  )
}
