import Link from "next/link"

import { cn } from "@/lib/utils"

// Il link all'informativa privacy, con lo stesso nome ovunque: in fondo alle
// pagine di accesso e nelle aree genitori e insegnanti. Alto 44 px anche se
// è solo testo: si tocca col pollice.
export const PRIVACY_PATH = "/privacy"
export const PRIVACY_LINK_LABEL = "Informativa privacy"

export function PrivacyLink({ className }: { className?: string }) {
  return (
    <Link
      href={PRIVACY_PATH}
      className={cn(
        "inline-flex min-h-11 items-center justify-center px-3 text-xs text-muted-foreground underline-offset-4 hover:underline",
        className,
      )}
    >
      {PRIVACY_LINK_LABEL}
    </Link>
  )
}
