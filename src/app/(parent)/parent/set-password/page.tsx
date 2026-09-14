import { redirect } from "next/navigation"

type PageProps = {
  searchParams: Promise<{ recovery?: string }>
}

// Compatibilità con i link inviati prima dello sprint onboarding: la scelta
// della password vive ora in /imposta-password (unica per tutti i ruoli).
export default async function ParentSetPasswordPage({ searchParams }: PageProps) {
  const { recovery } = await searchParams
  redirect(
    recovery === "1"
      ? "/imposta-password?tipo=recupero"
      : "/imposta-password?tipo=benvenuto",
  )
}
