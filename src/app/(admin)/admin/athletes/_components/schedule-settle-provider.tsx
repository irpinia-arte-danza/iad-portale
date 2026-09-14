"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

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

type OpenScheduleSettle = (schedule: SettleSchedule) => void

const ScheduleSettleContext = createContext<OpenScheduleSettle | null>(null)

export function useOpenScheduleSettle(): OpenScheduleSettle {
  const openSettle = useContext(ScheduleSettleContext)
  if (!openSettle) {
    throw new Error("useOpenScheduleSettle va usato dentro ScheduleSettleProvider")
  }
  return openSettle
}

interface ScheduleSettleProviderProps {
  athleteId: string
  athleteFirstName: string
  athleteLastName: string
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
  const [schedule, setSchedule] = useState<SettleSchedule | null>(null)
  const [open, setOpen] = useState(false)

  function openSettle(next: SettleSchedule) {
    setSchedule(next)
    setOpen(true)
  }

  return (
    <ScheduleSettleContext.Provider value={openSettle}>
      {children}
      {schedule ? (
        <ScheduleSettleDialog
          open={open}
          onOpenChange={setOpen}
          schedule={schedule}
          athleteId={athleteId}
          athleteFirstName={athleteFirstName}
          athleteLastName={athleteLastName}
          athletesForPaymentForm={athletesForPaymentForm}
          openSchedulesByAthlete={openSchedulesByAthlete}
        />
      ) : null}
    </ScheduleSettleContext.Provider>
  )
}
