"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import type { PaymentMethod } from "@prisma/client"

import type {
  AthleteWithFormRelations,
  OpenScheduleOption,
} from "../../payments/queries"
import {
  ScheduleSettleDialog,
  type SettleSchedule,
} from "./schedule-settle-dialog"

// Il dialog "Salda" vive qui, in un punto fisso della sezione Scadenze, e non
// dentro la riga della scadenza. Dopo il pagamento la pagina si aggiorna e la
// scadenza passa nel gruppo "Pagate": la riga viene smontata e rimontata in
// un altro gruppo, e un dialog tenuto nella riga si chiuderebbe da solo prima
// di poter emettere la ricevuta (scenario sportello: la famiglia aspetta).

// L'allieva arriva con la scadenza: nella scheda è sempre la stessa (e il
// provider la riceve come default), nell'elenco Scadenze cambia a ogni riga.
export type SettleTarget = SettleSchedule & {
  athlete?: { id: string; firstName: string; lastName: string }
  // Ultimo metodo usato dalla famiglia: precompila il form
  defaultMethod?: PaymentMethod | null
}

type OpenScheduleSettle = (target: SettleTarget) => void

const ScheduleSettleContext = createContext<OpenScheduleSettle | null>(null)

export function useOpenScheduleSettle(): OpenScheduleSettle {
  const openSettle = useContext(ScheduleSettleContext)
  if (!openSettle) {
    throw new Error("useOpenScheduleSettle va usato dentro ScheduleSettleProvider")
  }
  return openSettle
}

interface ScheduleSettleProviderProps {
  // Allieva di default: la scheda allieva ne ha una sola, l'elenco Scadenze
  // nessuna (la porta ogni riga)
  athleteId?: string
  athleteFirstName?: string
  athleteLastName?: string
  athletesForPaymentForm: AthleteWithFormRelations[]
  openSchedulesByAthlete: Record<string, OpenScheduleOption[]>
  children: ReactNode
}

export function ScheduleSettleProvider({
  athleteId,
  athleteFirstName,
  athleteLastName,
  athletesForPaymentForm,
  openSchedulesByAthlete,
  children,
}: ScheduleSettleProviderProps) {
  // Copia della scadenza presa all'apertura: resta valida anche quando, dopo
  // il pagamento, la scadenza risulta pagata e non è più "saldabile"
  const [target, setTarget] = useState<SettleTarget | null>(null)
  const [open, setOpen] = useState(false)

  function openSettle(next: SettleTarget) {
    setTarget(next)
    setOpen(true)
  }

  const athlete = target?.athlete ?? {
    id: athleteId ?? "",
    firstName: athleteFirstName ?? "",
    lastName: athleteLastName ?? "",
  }

  return (
    <ScheduleSettleContext.Provider value={openSettle}>
      {children}
      {target && athlete.id ? (
        <ScheduleSettleDialog
          open={open}
          onOpenChange={setOpen}
          schedule={target}
          athleteId={athlete.id}
          athleteFirstName={athlete.firstName}
          athleteLastName={athlete.lastName}
          defaultMethod={target.defaultMethod ?? null}
          athletesForPaymentForm={athletesForPaymentForm}
          openSchedulesByAthlete={openSchedulesByAthlete}
        />
      ) : null}
    </ScheduleSettleContext.Provider>
  )
}
