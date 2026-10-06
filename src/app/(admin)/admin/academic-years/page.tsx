import {
  canPrepareNextAcademicYear,
  nextAcademicYearLabel,
} from "@/lib/school-calendar"
import { todayDateOnly } from "@/lib/utils/date-only"

import { ResourceContent } from "../_components/resource-content"
import { ResourceHeader } from "../_components/resource-header"

import { AcademicYearsClient } from "./_components/academic-years-client"
import { listAcademicYears } from "./queries"

export default async function AcademicYearsPage() {
  const years = await listAcademicYears()

  // Il passaggio d'anno si propone solo quando ha senso: dal 1° giugno
  // dell'anno in cui finisce l'anno corrente (giorno di Roma), e solo se il
  // successivo non esiste già. Deciso qui e non nel browser, così il tasto
  // non dipende dall'orologio di chi guarda.
  const today = todayDateOnly()
  const current = years.find((y) => y.isCurrent) ?? null
  const nextLabel = current ? nextAcademicYearLabel(current.label) : null
  const prepareNext =
    current !== null &&
    nextLabel !== null &&
    !years.some((y) => y.label === nextLabel) &&
    canPrepareNextAcademicYear(current.endDate, today)
      ? {
          label: nextLabel,
          // L'anno corrente non è ancora finito: il cron notturno lo rimette
          // corrente fino alla sua fine, e il pannello lo deve dire
          currentStillRunning: current.endDate.getTime() >= today.getTime(),
        }
      : null

  return (
    <>
      <ResourceHeader
        breadcrumbs={[{ label: "Anni accademici" }]}
        title="Anni accademici"
        description="Periodi e contributo di iscrizione di ogni anno."
      />
      <ResourceContent>
        <AcademicYearsClient years={years} prepareNext={prepareNext} />
      </ResourceContent>
    </>
  )
}
