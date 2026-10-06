import Link from "next/link"

import { yearNotCurrentNotice } from "@/lib/years/year-context"

// La fascia sotto il titolo quando si guarda un anno che non è quello in
// corso: senza, si registra un incasso o si legge un totale credendo di
// essere nell'anno giusto. Ambra: è una cosa da sapere, non un errore.
export function YearNotice({
  selected,
  current,
  backHref,
}: {
  selected: string | null
  current: string | null
  // L'indirizzo dell'anno corrente: lo stesso senza il parametro dell'anno
  backHref: string
}) {
  const notice = yearNotCurrentNotice(selected, current)
  if (!notice) return null

  return (
    <p
      data-slot="year-notice"
      className="flex flex-wrap items-center gap-x-2 rounded-md border border-status-fix-border bg-status-fix-bg px-3 py-2 text-sm text-status-fix"
    >
      <span>{notice}</span>
      <span aria-hidden>·</span>
      <Link
        href={backHref}
        className="inline-flex min-h-11 items-center font-medium underline underline-offset-4"
      >
        Torna all&apos;anno corrente
      </Link>
    </p>
  )
}
