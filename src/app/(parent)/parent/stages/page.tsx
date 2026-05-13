import { Sparkles } from "lucide-react"

import { requireParent } from "@/lib/auth/require-parent"

import { listStagesForParent } from "../_actions/stages"
import { ParentStageCard } from "./_components/parent-stage-card"

export const dynamic = "force-dynamic"

export default async function ParentStagesPage() {
  const { parentId } = await requireParent()
  const stages = await listStagesForParent(parentId)

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
          Eventi occasionali aperti all&apos;iscrizione. Iscrivi le tue figlie
          e ricevi la scadenza di pagamento in dashboard.
        </p>
      </header>

      {stages.length === 0 ? (
        <div className="rounded-md border border-dashed bg-card py-12 text-center text-sm text-muted-foreground">
          Nessuno stage disponibile al momento.
        </div>
      ) : (
        <div className="space-y-4">
          {stages.map((s) => (
            <ParentStageCard key={s.id} stage={s} />
          ))}
        </div>
      )}
    </div>
  )
}
