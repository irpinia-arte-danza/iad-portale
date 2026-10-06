import { GraduationCap } from "lucide-react"

import { EmptyState } from "@/components/empty-state"
import { getAccessStatuses } from "@/lib/auth/access-status"

import { ResourceContent } from "../_components/resource-content"
import { ResourceHeader } from "../_components/resource-header"

import { listTeachers } from "./queries"
import { TeacherCreateDialog } from "./_components/teacher-create-dialog"
import { TeachersSearch } from "./_components/teachers-search"
import { TeachersTable } from "./_components/teachers-table"

interface PageProps {
  searchParams: Promise<{ search?: string }>
}

export default async function TeachersPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams
  const search = resolvedSearchParams.search ?? ""

  const { items, totalCount } = await listTeachers({ search })
  const accessStatuses = await getAccessStatuses("TEACHER", items)

  // Vuota davvero, non "la ricerca non ha trovato niente": lì la lista dice
  // la sua. Qui niente ricerca e niente "0 totali" — il tasto sta nello
  // stato vuoto, uno solo.
  if (totalCount === 0 && !search) {
    return (
      <>
        <ResourceHeader
          breadcrumbs={[{ label: "Insegnanti" }]}
          title="Insegnanti"
        />
        <ResourceContent>
          <EmptyState
            icon={GraduationCap}
            title="Ancora nessuna insegnante"
            description="Vedono solo i loro corsi e segnano le presenze dal telefono"
            action={<TeacherCreateDialog />}
          />
        </ResourceContent>
      </>
    )
  }

  return (
    <>
      <ResourceHeader
        breadcrumbs={[{ label: "Insegnanti" }]}
        title="Insegnanti"
        description="Anagrafica insegnanti e collaboratori sportivi e accesso all'area insegnanti."
        action={<TeacherCreateDialog />}
      />
      <ResourceContent>
        <div className="flex flex-col gap-4">
          <TeachersSearch defaultValue={search} />
          <TeachersTable teachers={items} accessStatuses={accessStatuses} />
          {/* Mai "0 totali": se la ricerca non trova niente lo dice la lista */}
          {totalCount > 0 ? (
            <p className="text-xs text-muted-foreground">
              {totalCount} {totalCount === 1 ? "insegnante" : "insegnanti"}{" "}
              totali
            </p>
          ) : null}
        </div>
      </ResourceContent>
    </>
  )
}
