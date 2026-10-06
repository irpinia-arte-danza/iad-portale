// Lo slot `panel` ospita la scheda allieva quando si apre da questa lista:
// la lista (children) resta montata dietro, con filtri, scorrimento e
// selezioni. Vedi src/lib/athletes/card-panel.ts.
export default function ListWithAthletePanelLayout({
  children,
  panel,
}: {
  children: React.ReactNode
  panel: React.ReactNode
}) {
  return (
    <>
      {children}
      {panel}
    </>
  )
}
