// L'esito di un caricamento fallito, scritto dentro il modulo e non solo nel
// toast: il pannello resta aperto e si vede cosa è successo (il toast su
// iPad sparisce mentre Giuseppina guarda il foglio)
export function UploadError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p
      role="alert"
      className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      {message}
    </p>
  )
}
