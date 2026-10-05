"use client"

import { UserPlus, UserX } from "lucide-react"

import { Button } from "@/components/ui/button"
import { GUARDIAN_GAP_LOSSES } from "@/lib/athletes/guardian-gap"

import { GuardianPickerDialog } from "../../_components/guardian-picker-dialog"

type Props = {
  athleteId: string
  athleteFirstName: string
}

// Avviso in cima alla scheda: minorenne, nessun genitore collegato.
//
// Non è un errore del portale ed è giusto che non le si scriva: è un dato che
// manca. Ma finché manca la famiglia non riceve nulla e nessuno lo sa, quindi
// l'avviso dice per nome cosa non arriva e apre lo stesso dialog dei
// genitori — non un percorso diverso.
export function MissingGuardianAlert({ athleteId, athleteFirstName }: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm sm:flex-row sm:items-start dark:border-amber-800 dark:bg-amber-950/30">
      <UserX className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" />
      <div className="flex-1 space-y-2">
        <p className="font-semibold text-amber-900 dark:text-amber-100">
          Nessun genitore collegato
        </p>
        <p className="text-amber-800 dark:text-amber-200">
          {athleteFirstName} è minorenne: le comunicazioni della scuola vanno a
          un adulto, e senza un genitore collegato non c&apos;è nessuno a cui
          scrivere. Alla famiglia non arrivano:
        </p>
        <ul className="list-disc space-y-0.5 pl-5 text-amber-800 dark:text-amber-200">
          {GUARDIAN_GAP_LOSSES.map((loss) => (
            <li key={loss}>{loss}</li>
          ))}
        </ul>
        <p className="text-xs text-amber-800/90 dark:text-amber-200/90">
          L&apos;allieva resta iscritta e le presenze si segnano normalmente:
          manca solo chi la rappresenta.
        </p>
      </div>
      <GuardianPickerDialog
        athleteId={athleteId}
        existingGuardians={[]}
        trigger={
          <Button size="sm" className="shrink-0">
            <UserPlus className="h-4 w-4" />
            Collega un genitore
          </Button>
        }
      />
    </div>
  )
}
