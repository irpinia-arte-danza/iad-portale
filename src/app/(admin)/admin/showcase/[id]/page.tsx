import { notFound } from "next/navigation"

import { Badge } from "@/components/ui/badge"

import { ResourceContent } from "../../_components/resource-content"
import { ResourceHeader } from "../../_components/resource-header"

import { getShowcaseById, listShowcaseEnrollableAthletes } from "../queries"
import { ShowcaseInfoTab } from "./_components/showcase-info-tab"
import { ShowcaseRosterTab } from "./_components/showcase-roster-tab"
import { ShowcaseTabsNav } from "./_components/showcase-tabs-nav"

export const dynamic = "force-dynamic"

const DATE_IT = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

type SearchParams = Promise<{ tab?: string }>
type Params = Promise<{ id: string }>

export default async function ShowcaseDetailPage({
  params,
  searchParams,
}: {
  params: Params
  searchParams: SearchParams
}) {
  const { id } = await params
  const sp = await searchParams
  const showcase = await getShowcaseById(id)
  if (!showcase) notFound()

  const isCancelled = showcase.deletedAt !== null

  const validTabs = ["info", "partecipanti"] as const
  type TabKey = (typeof validTabs)[number]
  const activeTab: TabKey = (
    sp.tab && (validTabs as readonly string[]).includes(sp.tab)
      ? sp.tab
      : "info"
  ) as TabKey

  const enrollableAthletes = await listShowcaseEnrollableAthletes(id)

  const confirmedCount = showcase.participations.filter((p) => p.confirmed).length

  return (
    <>
      <ResourceHeader
        breadcrumbs={[
          { label: "Saggio", href: "/admin/showcase" },
          { label: showcase.title },
        ]}
        title={showcase.title}
        description={`${DATE_IT.format(showcase.date)} · ${showcase.location ?? "luogo non specificato"}`}
        action={
          <div className="flex items-center gap-2">
            {isCancelled ? (
              <Badge variant="destructive">Cancellato</Badge>
            ) : (
              <Badge>AA {showcase.academicYear.label}</Badge>
            )}
          </div>
        }
      />
      <ResourceContent>
        <div className="flex flex-col gap-6">
          <ShowcaseTabsNav
            basePath={`/admin/showcase/${showcase.id}`}
            activeKey={activeTab}
            tabs={[
              { key: "info", label: "Info" },
              {
                key: "partecipanti",
                label: `Partecipanti (${showcase.participations.length}${confirmedCount > 0 ? ` · ${confirmedCount} conf.` : ""})`,
              },
            ]}
          />

          {activeTab === "info" && <ShowcaseInfoTab showcase={showcase} />}
          {activeTab === "partecipanti" && (
            <ShowcaseRosterTab
              showcase={showcase}
              enrollableAthletes={enrollableAthletes}
            />
          )}
        </div>
      </ResourceContent>
    </>
  )
}
