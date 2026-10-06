"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { AlertTriangle, Calendar } from "lucide-react"

import { showsAcademicYearChip } from "@/lib/years/year-context"

type Props = {
  // Label dell'anno con isCurrent = true, null se nessuno lo è
  label: string | null
}

// Chip dell'anno accademico nell'header: dice su quale anno sta lavorando il
// portale, niente di più. NON è un selettore: il cambio d'anno avviene da
// Anni accademici, dove si vede cosa comporta.
//
// Nelle pagine ad anno fiscale (Ricevute, Bilancio, Corrispettivi, Export)
// non compare: lì l'anno che conta è un altro, e lo dice il selettore
// accanto al titolo. Due anni diversi sulla stessa schermata, senza
// spiegazione, erano il problema.
export function AcademicYearChip({ label }: Props) {
  const pathname = usePathname()
  if (!showsAcademicYearChip(pathname)) return null

  if (!label) {
    return (
      <Link
        href="/admin/academic-years"
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-amber-400 bg-amber-50 px-3 text-xs font-medium text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        Nessun anno corrente
      </Link>
    )
  }

  return (
    <Link
      href="/admin/academic-years"
      className="inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      <Calendar className="h-3.5 w-3.5" />
      AA {label}
    </Link>
  )
}
