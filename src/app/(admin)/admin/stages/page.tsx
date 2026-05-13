import { ResourceContent } from "../_components/resource-content"
import { ResourceHeader } from "../_components/resource-header"

import { listStages } from "./queries"
import { StageCreateDialog } from "./_components/stage-create-dialog"
import { StagesTable } from "./_components/stages-table"

export const dynamic = "force-dynamic"

export default async function StagesPage() {
  const stages = await listStages({ includeDeleted: true })

  return (
    <>
      <ResourceHeader
        breadcrumbs={[{ label: "Stage" }]}
        title="Stage workshop"
        description="Eventi occasionali a iscrizione, con quota e capienza dedicata."
        action={<StageCreateDialog />}
      />
      <ResourceContent>
        <div className="flex flex-col gap-4">
          <StagesTable stages={stages} />
          <p className="text-xs text-muted-foreground">
            {stages.length}{" "}
            {stages.length === 1 ? "stage totale" : "stage totali"}
          </p>
        </div>
      </ResourceContent>
    </>
  )
}
