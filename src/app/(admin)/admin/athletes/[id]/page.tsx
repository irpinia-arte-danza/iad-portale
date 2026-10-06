import { AthleteCard } from "./_components/athlete-card"

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}

// La pagina intera della scheda. Il contenuto è AthleteCard, lo stesso che
// si apre in pannello da Scadenze e Certificati (intercepting route): chi
// ricarica o arriva da un link vede questa.
export default async function AthleteDetailPage({
  params,
  searchParams,
}: PageProps) {
  const [{ id }, { tab }] = await Promise.all([params, searchParams])
  return <AthleteCard athleteId={id} tab={tab} variant="page" />
}
