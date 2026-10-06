// ─────────────────────────────────────────────────────────────────────────
// Quanto vive un link firmato a un file privato (certificati medici,
// tessere). Un solo numero per tutti i bucket.
//
// Cinque minuti: il link nasce quando si preme "Scarica" e serve a far
// aprire il file nel visualizzatore, cioè subito. Chiunque lo abbia in mano
// dopo — una cronologia del browser, un messaggio inoltrato, uno screenshot
// dell'indirizzo — trova un link scaduto. Prima erano 24 ore e il link
// veniva anche salvato nel database: un certificato medico resta un dato
// sanitario di una minorenne anche quando è un URL.
//
// Il link non si genera mai al rendering della pagina e non si salva: lo
// chiede una server action al clic (refreshMedicalCertSignedUrl,
// refreshCardSignedUrl, getPortalCardUrl). Le ricevute non passano di qui:
// le serve la route /ricevute/[id] con la sessione di chi le apre.
// ─────────────────────────────────────────────────────────────────────────
export const SIGNED_URL_TTL_SECONDS = 5 * 60
