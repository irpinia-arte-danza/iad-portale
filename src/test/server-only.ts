// Stub di "server-only" per Vitest.
//
// Il pacchetto vero lancia un errore appena importato fuori da un
// React Server Component: è il suo lavoro, e nel build di Next ferma un
// import sbagliato da un componente client. Nei test gira Node e basta, e
// i moduli segnati server-only (Prisma, admin client di Supabase, Storage,
// Resend) devono potersi importare o simulare: questo file vuoto prende il
// posto del pacchetto (alias in vitest.config.ts).
export {}
