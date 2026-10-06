import { AthleteCard } from "@/app/(admin)/admin/athletes/[id]/_components/athlete-card"

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}

// Intercetta /admin/athletes/{id} quando ci si arriva da questa lista: la
// stessa scheda della pagina, dentro il pannello. Ricaricando l'indirizzo
// (o arrivando da fuori) Next mostra la pagina intera.
export default async function AthletePanelPage({
  params,
  searchParams,
}: PageProps) {
  const [{ id }, { tab }] = await Promise.all([params, searchParams])
  return <AthleteCard athleteId={id} tab={tab} variant="panel" />
}
