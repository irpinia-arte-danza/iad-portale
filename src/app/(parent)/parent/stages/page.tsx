import { Sparkles } from "lucide-react"

import { requirePortalAccess } from "@/lib/auth/require-portal-access"
import { portalWording } from "@/lib/portal/wording"

import { listStagesForPortal } from "../_actions/stages"
import { ParentStageCard } from "./_components/parent-stage-card"

export const dynamic = "force-dynamic"

export default async function ParentStagesPage() {
  const { scope } = await requirePortalAccess()
  const stages = await listStagesForPortal(scope)
  const wording = portalWording(scope)

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          <h1 className="text-2xl font-semibold tracking-tight">
            Stage workshop
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {wording.stagesPageIntro}
        </p>
      </header>

      {stages.length === 0 ? (
        <div className="rounded-md border border-dashed bg-card py-12 text-center text-sm text-muted-foreground">
          Nessuno stage disponibile al momento.
        </div>
      ) : (
        <div className="space-y-4">
          {stages.map((s) => (
            <ParentStageCard
              key={s.id}
              stage={s}
              wording={wording}
              selfService={scope.kind === "athlete"}
            />
          ))}
        </div>
      )}
    </div>
  )
}
