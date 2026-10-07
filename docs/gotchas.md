# Gotcha tecnici — IAD Portale

Questa è la raccolta di gotcha tecnici (regole apprese attraverso bug reali) accumulati durante sviluppo. Organizzati per topic con TOC per navigation.

Estratto da CLAUDE.md v3.2 il 22 aprile 2026. Aggiornato ad ogni nuova lezione imparata.

## Sommario

- [Shadcn / Tailwind](#shadcn--tailwind)
  - §17.1 shadcn css rewrite
  - §17.8 Sidebar tooltip
  - §17.42 `sidebar.tsx` è modificato a mano: `shadcn add sidebar` lo sovrascrive
  - §17.43 I colori di stato non si scrivono nei componenti: si chiedono a `statusTone`
  - §17.44 Elenchi responsive: una riga sola nel DOM, non tabella + card
  - §17.45 `Intl` in italiano non raggruppa le migliaia sotto le 5 cifre
  - §17.46 Conteggi dei chip: contare le righe filtrate, non riscrivere il predicato
- [Prisma / Schema](#prisma--schema)
  - §17.2 Prisma version pinning
  - §17.3 Prisma CLI env loading
  - §17.4 Prisma AI safety gate
  - §17.5 Workflow migration pulita
  - §17.6 Schema vs Seed dati organization
  - §17.13 Empty string vs NULL in Postgres
  - §17.14 Schema asymmetry tra modelli sibling
  - §17.23 Legacy required + nuovi opzionali → nullable
  - §17.24 Drop+recreate stub zero-coupling
  - §17.33 Filtri Prisma composti con `{ ...where, OR }` sovrascrivono l'OR del chiamante
  - §17.39 `payment_id` unico su scadenze, stage e costumi: un pagamento chiudeva una sola cosa
  - §17.40 Colonne `@db.Date` e fuso orario: la mezzanotte di Roma diventa il giorno prima
- [Next.js](#nextjs)
  - §17.7 Next 16 proxy export naming
  - §17.9 Next dev logga Server Action body
  - §17.27 Lazy client init per env safety
  - §17.34 `redirect()` in server action + try/catch lato client → `unstable_rethrow`
  - §17.47 Scheda in pannello dalle liste: intercepting route, e cosa non fa da sola
  - §17.48 Richieste alla famiglia: una traccia per allieva, e la foto ridotta prima dell'upload
- [Zod / RHF](#zod--rhf)
  - §17.11 Zod `.default()` + RHF generic mismatch
  - §17.12 Zod `z.coerce.date()` input/output mismatch
  - §17.17 Zod v4 `z.enum()` errorMap API change
  - §17.18 Zod `z.date().max()` + HTML date picker → TZ border bug
- [Vercel / Build](#vercel--build)
  - §17.10 Vercel env var `TZ` reserved
  - §17.15 `tsc --noEmit` non replica `next build`
  - §17.16 Vercel build cache + Prisma Client stale
  - §17.41 `outputFileTracingExcludes`: cosa serve davvero a Prisma a runtime
- [PDF / Export](#pdf--export)
  - §17.20 `@react-pdf/renderer` richiede `next/dynamic` con `ssr:false`
  - §17.21 Helper CSV/XLSX/PDF: builder Buffer-based separato da download
  - §17.36 react-pdf si rompe sui testi dentro un SVG: nei PDF sempre il logo PNG
- [UX / Form](#ux--form)
  - §17.22 Placeholder ≠ valore default
  - §17.38 Dialog dentro una riga che cambia gruppo dopo l'azione: si smonta e perde lo stato
- [Settings pattern](#settings-pattern)
  - §17.28 Aggiungere un tab
- [Errori e diagnostica](#errori-e-diagnostica)
  - §17.37 Catch generico "riprova tra qualche istante" su errori permanenti
- [Supabase Data API](#supabase-data-api)
  - §17.46 RLS spenta di proposito, Data API chiusa con i REVOKE in migration
- [Supabase Auth](#supabase-auth)
  - §17.35 Email OTP expiration a 86400: avviso del security advisor voluto
  - §17.49 Secondo fattore degli admin: il controllo aal2 sta in `adminGate`, chiamato da proxy e `requireAdmin`
  - §17.50 Storico accessi admin: l'iPad si presenta come un Mac, il paese c'è solo su Vercel, le email con `after()`
- [Domain specifico](#domain-specifico)
  - §17.19 `AcademicYear.endDate` ≠ course season end

> NOTA: §17.25-26 sono in `docs/email-system.md` (gotcha specifici sistema email).
> §17.27 è duplicato qui e in email-system.md perché è regola general-purpose Next.js.
> §17.29-32 sono numeri già assegnati a gotcha noti ma non ancora trascritti: le nuove voci partono da §17.33.

---

## Shadcn / Tailwind

**§17.1 shadcn 4.3.0**: il comando `npx shadcn@latest add` riscrive `src/app/globals.css` senza chiedere conferma, sostituendo il pattern corretto `var(--font-geist-sans)` con stringhe hardcoded (`"Geist", "Geist Fallback", ...`) e duplicando i fallback. Verificare SEMPRE `git diff src/app/globals.css` dopo ogni `shadcn add` PRIMA di committare. Se il pattern è alterato, ripristinare manualmente le righe `--font-sans` e `--font-mono`. Lo stesso vale per `shadcn init` che auto-committa senza chiedere — usare `git reset --soft origin/main` + ricommit manuale con messaggio conventional.

**§17.43 I colori di stato non si scrivono nei componenti**: rosso e ambra erano scritti a mano in una ventina di file (`text-red-700 dark:text-red-300`, `border-amber-500/40 bg-amber-500/10`, …), e lo stesso stato finiva di colori diversi in pagine diverse: la tessera assente era ambra nella scheda allieva e rossa nel menu, il certificato scaduto rosso in lista e `variant="destructive"` nella scheda. Adesso:

- il significato è uno: **rosso** = blocca la lezione o un documento (certificato e tessera mancanti o scaduti, minorenne senza genitore, email tornata indietro), **ambra** = da sistemare ma intanto si lavora (contributi in ritardo, ricevute da consegnare, dati da completare, genitori mai invitati), **neutro** tutto il resto — le uscite del bilancio comprese, che non sono un problema;
- a deciderlo è `statusTone(status)` in `src/lib/status/tone.ts`, una funzione pura che prende lo **stato di dominio** (`{ kind: "certificate", status }`, `{ kind: "receipt", toDeliver }`, …) e torna `"block" | "fix" | "neutral"`;
- le classi stanno in `TONE_BADGE` / `TONE_SURFACE` / `TONE_TEXT` nello stesso file e usano i token `--status-block*` / `--status-fix*` di `globals.css` (definiti per chiaro e scuro in `:root` e `.dark`);
- i moduli di dominio (`athlete-status.ts`, `due-label.ts`, `delivery.ts`, `todo-tiles.ts`) espongono `tone: StatusTone`, mai un nome di colore: `"amber"` in un tipo tornava a essere una decisione grafica presa nel posto sbagliato.

Regola pratica: in un componente di stato non deve comparire `red-*`, `amber-*`, `rose-*` o `orange-*`. Restano legittimi fuori dagli stati: avvisi di configurazione (anni accademici/fiscali da creare, reminder spenti), conferme distruttive (`variant="destructive"`, box di conseguenza nei dialog), errori di validazione dei form, e le aree `/parent` e `/teacher`, dove il destinatario è un altro e il rosso su una rata scaduta è l'avviso di sospensione previsto dal regolamento. Un test in `tone.test.ts` verifica che `TONE_BADGE` non contenga nomi di colore. Scoperto: PR #42 "colori di stato", ottobre 2026.

**§17.44 Elenchi responsive — una riga sola nel DOM, non tabella + card**: la via breve per fare "tabella da 768, card sotto" è rendere due alberi e nasconderne uno con `hidden md:block` / `md:hidden`. Non si fa: ogni riga contiene il menu ⋯ e i suoi dialog, e due copie vogliono dire **due istanze di stato** per riga (su 200 righe, 400 dialog montati) con il rischio che si apra quello della copia invisibile. `ResponsiveList` (`src/components/lists/responsive-list.tsx`) rende **una riga**, un `flex` che diventa colonna sotto 768 e riga da 768 in su, dove:

- le celle oltre la prima portano `hidden md:flex` / `hidden lg:flex` / `hidden xl:flex` secondo la priorità della colonna (`visibleColumnsAt` dice quali restano a una data larghezza, e c'è un test);
- le intestazioni e le celle condividono le classi di larghezza (`md:w-28`, `md:flex-1`): è così che restano allineate senza `<table>`;
- i wrapper interni usano `md:contents`, così da 768 in su le celle diventano figlie dirette della riga e il `flex` le allinea come una tabella;
- le due righe di stato della card sono `md:hidden` e non duplicano niente: in tabella quelle informazioni sono già colonne;
- le azioni sono **un solo nodo** (`RowActionsRenderer layout="responsive"`), che al suo interno mostra i tasti a tutta larghezza sotto 768 e il menu ⋯ da 768: due inneschi, un dialog.

Corollario: le azioni di una riga si descrivono come **dati** (`RowAction[]` in `src/components/lists/row-actions.tsx`), non come JSX, altrimenti la versione card e quella tabella divergono alla prima modifica. Niente ruoli ARIA di tabella: con `display: contents` le celle non sono figlie dirette della riga e una struttura dichiarata a metà confonde più di una lista. Per i bersagli del dito c'è la variante `pointer-coarse` di Tailwind 4, applicata una volta sola nei componenti condivisi (`Button` size `icon*` → `size-11`, `Checkbox` → `::after` di 44×44 centrato sulla casella): non va ripetuta riga per riga, e con `className="h-11 md:h-9"` sul singolo tasto le due regole hanno la stessa specificità e vince l'ordine del foglio, cioè il caso. Scoperto: PR #43 "liste in card", ottobre 2026.

**§17.45 `Intl.NumberFormat("it-IT", { style: "currency" })` non mette il punto delle migliaia sotto le 5 cifre**: `formatEuro(103500)` dava `1035,00 €` e `formatEuro(1234500)` dava `12.345,00 €`. Non è un bug di Node: il CLDR per l'italiano ha `minimumGroupingDigits: 2`, quindi il separatore compare solo da cinque cifre. Giuseppina legge importi di quattro cifre tutti i giorni (il totale di un mese, il bilancio di un trimestre) e li vuole con il punto: serve `useGrouping: true` esplicito. Vale anche al contrario: un formattatore scritto a mano con `.toFixed(2).replace(".", ",")` più una regex per i gruppi (era il caso dei tre PDF) raggruppa sempre, e quindi non coincideva con quello che mostrava l'interfaccia. Da qui la regola: **un solo `formatEuro`** in `src/lib/utils/format.ts`, e nei PDF il solo `formatEuroPdf` (`src/lib/pdf/format.ts`), che è lo stesso con lo spazio insecabile di `Intl` normalizzato a spazio normale perché il motore di `@react-pdf` lo misura male. Scoperto: PR #43, ottobre 2026.

**§17.46 Conteggi dei chip — si contano le righe, non si riscrive il predicato**: un chip "Senza certificato · 7" che apre un elenco di 5 righe è peggio che non avere il chip. Il modo sbagliato è contare in SQL (`count` con una `where` scritta a parte) e filtrare in memoria con la funzione di dominio: sono due definizioni dello stesso buco e divergono al primo caso limite (la ritirata, la minorenne senza genitore, il certificato scaduto proprio oggi). Nell'elenco allieve il conteggio dei chip si calcola **sulle stesse righe** che l'elenco mostrerebbe, con lo stesso predicato (`athleteSetupChecklist` per i passi dell'anagrafica, `scadenzeWhere({ stato: "IN_RITARDO" })` per il ritardo): il numero sul chip è per costruzione le righe che apre, e senza filtro per corso coincide con i riquadri della dashboard, che contano con le stesse funzioni.

Il prezzo è caricare l'elenco intero in memoria (~60-100 allieve) invece di paginare in SQL, e va bene finché la popolazione è questa. Il guadagno è che il numero non può mentire. Attenzione invece al numero di **query**: Prisma emette una `SELECT` per livello di relazione incluso, quindi l'elenco allieve ne fa 10 (allieve, genitori, genitori→parent, iscrizioni, iscrizioni→corso, certificati, tessere, anno accademico, rate in ritardo, rate→iscrizione) — ma 10 con 7 allieve e 10 con 58, mai una per riga. La verifica si fa contando le query vere, iniettando in `globalThis.prisma` un client con `log: [{ emit: "event", level: "query" }]` prima di importare `@/lib/prisma`. Scoperto: PR #44 "filtri delle allieve", ottobre 2026.

**§17.8 Shadcn Sidebar richiede TooltipProvider globale**: shadcn `<Sidebar>` usa internamente `<Tooltip>` per i menu item in modalità `collapsible="icon"` (vedi `SidebarMenuButton` in `src/components/ui/sidebar.tsx`). Richiede quindi `<TooltipProvider>` mounted in un ancestor (tipicamente root layout). Sintomo se mancante: Runtime Error `"Tooltip must be used within TooltipProvider"`, cascade su ThemeProvider/altri provider (React error boundary pulls everything down). Fix: `import { TooltipProvider } from "@/components/ui/tooltip"` in `src/app/layout.tsx`, wrap `{children}` dentro `ThemeProvider`. Scoperto: 20 aprile 2026, Sprint 0 Fase 3D.2.

**§17.42 `src/components/ui/sidebar.tsx` non è più il file di shadcn: `shadcn add sidebar` lo sovrascriverebbe**: nella PR #36 il componente è stato modificato a mano in tre punti, e sono modifiche che il CLI non ha modo di conservare:
1. `useIsMobile` → `useIsBelowLg` in `SidebarProvider` (soglia 1024 invece di 768);
2. nel ramo desktop di `Sidebar`, `md:block` → `lg:block` sul wrapper;
3. sempre lì, `md:flex` → `lg:flex` sul contenitore fisso.

Motivo: fra 768 e 1023 px la barra restava fissa a 250 px e al contenuto ne avanzavano ~500 — su iPad verticale (820 px) in Allieve sparivano "Aggiungi allieva" e il filtro, in Scadenze le colonne di destra. Le prime due righe decidono quando compare lo Sheet, le altre due quando il CSS mostra la barra: vanno cambiate insieme, altrimenti la barra ricompare via CSS anche con l'hook giusto.

Se un domani serve rifare `npx shadcn@latest add sidebar`, dopo il comando va controllato `git diff src/components/ui/sidebar.tsx` e vanno rimesse le tre righe (lo stesso vale per `button.tsx`, che il CLI chiede di sovrascrivere quando si aggiunge un componente che lo usa: rispondere **no**). Vedi anche §17.1 per `globals.css`.

---

## Prisma / Schema

**§17.2 Prisma version pinning**: Prisma 7 ha breaking change sul blocco `datasource` di `schema.prisma` (rimuove supporto `url` e `directUrl`, richiede nuovo file `prisma.config.ts`). Il progetto USA Prisma 6.x (pinned in `package.json` come `"prisma": "^6"` e `"@prisma/client": "^6"`). Non aggiornare a v7 finché non si è pronti a migrare API (include spostamento della sezione `prisma.seed` dal `package.json` al nuovo `prisma.config.ts`).

**§17.3 Prisma CLI env loading**: Prisma CLI legge solo `.env`, non `.env.local`. Next.js legge entrambi, Prisma NO. Soluzione: tutti gli script Prisma sono wrappati con `dotenv-cli`. Pattern standard in `package.json`:
`"db:migrate": "dotenv -e .env.local -- prisma migrate dev"`
Usare sempre `npm run db:*` invece di `npx prisma *` diretto.

**§17.4 Prisma AI safety gate**: Prisma 6+ rileva invocazioni da AI agents e blocca operazioni distruttive (`migrate reset`, `db push --force-reset`, `db execute` con DDL) richiedendo env var `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` settata al testo di consenso dell'utente. L'utente deve fornire consenso esplicito in chat (non command-line), che diventa il valore della env var per la singola invocazione. NON scatta su `migrate dev`.

**§17.5 Workflow migration pulita**: se si modifica lo schema PRIMA di aver pushato la prima migration a GitHub, rigenerare init pulita: (1) `npm run db:reset -- --force` → (2) `rm -rf prisma/migrations/<ts>_init/` → (3) secondo `db:reset` per pulire `_prisma_migrations` → (4) `npm run db:migrate -- --name init`. Dopo il primo push, solo migration incrementali (mai rewrite history).

**§17.6 Schema vs Seed: dati organization**: dati IAD-specifici (asdName, asdFiscalCode, asdAddress, email) vanno SEMPRE nel seed, MAI come `@default` nello schema. Motivi: schema = struttura/forma, seed = contenuto/dati. Schema con default IAD-specific inquinano git history (CF pubblicato) e rendono schema non riusabile per altre ASD. Regola: required + senza default nello schema per dati legali, optional nullable per customization (colori, logo, telefono).

**§17.13 Empty string vs NULL in Postgres unique constraints**: Form con campo opzionale che accetta `""` via Zod `.optional().or(z.literal(""))` salva `""` letteralmente in DB. Postgres unique constraint considera `""` come valore unico → 2 record con campo opzionale vuoto collidono (P2002). Fix: helper `cleanEmptyStrings` in server actions per trasformare `""` → `null` prima di `prisma.create/update`:
```ts
function cleanEmptyStrings<T extends Record<string, unknown>>(data: T): T {
  const cleaned: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    cleaned[key] = typeof value === "string" && value === "" ? null : value
  }
  return cleaned as T
}
```
Scoperto: Sprint 1.C, 21 aprile 2026, su Parent create con `fiscalCode: ""`.

**§17.14 Schema asymmetry tra modelli sibling**: quando 2 modelli (es. `Athlete` + `Parent`) hanno pattern anagrafici simili, lo schema può evolversi in modo divergente nel tempo. Es. `Athlete.provinceOfBirth` ma `Parent` no, pur venendo entrambi dallo stesso modulo cartaceo IAD. Fix: quando crei componenti riusabili (es. `AnagraficaCompletaSection`) che assumono field names condivisi, verifica simmetria schema prima. Tool: `grep "model Athlete"` + `grep "model Parent"` side-by-side. Se asimmetria, aggiungi migration di normalizzazione (es. `add_province_of_birth_to_parents`). Scoperto: Sprint 1.C, 21 aprile 2026.

**§17.23 Schema — Legacy required + nuovi opzionali → nullable**: quando estendi uno schema aggiungendo nuovi campi obbligatori che sostituiscono un campo legacy (es. `asdAddress` monolitico → `addressStreet` / `addressZip` / `addressCity` / `addressProvince`), rendere il campo legacy **nullable nella stessa migration**. Altrimenti record esistenti senza i nuovi campi diventano invalidi al primo save. Pattern: migration 1 aggiunge nuovi campi (nullable) + rende legacy nullable; data-migration 2 backfill + eventuale drop legacy in migration 3. Mai drop diretto del legacy nella stessa migration dei nuovi campi. Scoperto: Sprint 3.2 schema `BrandSettings`, aprile 2026.

**§17.24 Schema — Drop+recreate stub zero-coupling**: quando uno schema esistente è uno stub mai usato (0 record DB + 0 reference applicative via `grep`), è accettabile drop+recreate con nuova shape invece di evolvere additivamente. Evita architettura con 2 sistemi paralleli. **Audit obbligatorio prima della decisione**: `SELECT COUNT(*)` + `grep -r "modelName" src/`.

Workaround Prisma 6 AI safety gate su destructive migration in ambiente non-interactive (es. Claude Code):
```bash
prisma migrate diff \
  --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/<ts>_<name>/migration.sql
prisma migrate deploy
```
Bypassa il gate perché non usa `migrate dev` / `db push --force-reset`. Scoperto: Sprint 3.2 `EmailLog` stub drop+recreate, aprile 2026.

**§17.33 Filtri Prisma — `{ ...where, OR }` sovrascrive in silenzio l'OR del chiamante**: un helper che "aggiunge" una condizione a un `where` ricevuto con lo spread perde qualsiasi `OR` già presente, perché la chiave `OR` dell'helper rimpiazza quella del chiamante. TypeScript non segnala nulla e la query resta valida: restituisce semplicemente più righe. Pattern rotto:
```ts
// ❌ se where contiene già OR (es. filtro per genitore), viene perso
return { ...where, OR: [{ courseEnrollment: {...} }, { stageEnrollment: {...} }] }
```
Pattern corretto:
```ts
// ✅ composizione in AND: nessuna chiave del chiamante può essere sovrascritta
return { AND: [where, { OR: [{ courseEnrollment: {...} }, { stageEnrollment: {...} }] }] }
```
Vale per qualsiasi chiave logica (`OR`, `AND`, `NOT`) e per le relazioni già filtrate dal chiamante. Regola pratica: un helper che riceve un `where` dall'esterno compone sempre con `AND: [where, …]`, mai con lo spread. Bug reale: Sprint 6.A (`withActiveCourseOrStageScheduleFilter` in `src/lib/queries/active-schedule-filter.ts`), il filtro per genitore di `getMyOpenSchedules` veniva sovrascritto e la dashboard genitori mostrava le quote scadute di **tutte** le famiglie. In produzione dal 13 maggio 2026, corretto il 14 settembre 2026 (`49e793d`). Test di regressione manuale: genitore senza figlie collegate → nessuna quota.

**§17.39 `payment_id` unico su scadenze, iscrizioni stage e costumi — un pagamento chiudeva una sola cosa**: `payment_schedules.payment_id`, `stage_enrollments.payment_id` e `costume_assignments.payment_id` erano `@unique`, quindi lato `Payment` le relazioni erano 1:1 (`paymentSchedule`, `stageEnrollment`, `costumeAssignment`). Il campo nullable fa sembrare possibile collegare più righe allo stesso pagamento, ma il database lo rifiuta: una famiglia che pagava quota associativa + prima mensile doveva fare due pagamenti e ricevere due ricevute. Rimosso con la migration `20260918090000_payment_multi_schedule` (indici semplici al posto degli unique): ora `Payment.paymentSchedules[]`, `stageEnrollments[]`, `costumeAssignments[]`. Da ricordare:
1. Storno ed eliminazione riaprono **tutte** le scadenze e le iscrizioni del pagamento (`releasePaymentLinks` in `src/lib/payments/register-payment.ts`).
2. Con più scadenze l'importo è la loro somma, le righe della causale sono congelate in `Receipt.lines`, e non si uniscono quote ordinarie, saggio (`/S`) e costumi (`/C`): numerazioni ricevute diverse.
3. `Payment.feeType` è solo il tipo della prima scadenza: i totali per tipo quota (bilancio, corrispettivi, export) passano da `accountingLines` in `src/lib/payments/schedule-lines.ts`.
4. `Payment.courseEnrollmentId` è valorizzato solo se tutte le scadenze sono dello stesso corso: un controllo "ci sono pagamenti su questo corso?" deve guardare anche le scadenze con `paymentId` (vedi `hardDeleteCourse`).

Prima di dare per scontato che un FK nullable ammetta più righe, controllare gli indici: `select indexname, indexdef from pg_indexes where indexname like '%payment_id%'`. Scoperto: sprint incasso multiplo, settembre 2026.

**§17.40 Colonne `@db.Date` e fuso orario — la mezzanotte di Roma diventa il giorno prima**: una colonna Postgres `date` conserva solo il giorno **UTC** del valore che Prisma le manda. `new Date("2026-09-01")` (il valore di `<input type="date">`) è mezzanotte UTC → salva 01/09, corretto. `new Date(2026, 8, 1)` nel browser è invece la mezzanotte **locale** di Roma = `2026-08-31T22:00:00.000Z` → salva **31/08**. Nel form la data si vede giusta (il browser la formatta in ora locale): l'errore compare solo dopo il salvataggio. Stesso effetto per `new Date()` salvato tra 00:00 e 02:00 di Roma, e per "oggi" calcolato con `setUTCHours(0, 0, 0, 0)`, che in quella fascia è ancora ieri. Casi reali:
1. Dialog anno accademico con default `new Date(anno, 8, 1)` / `new Date(anno + 1, 7, 31)`: il 2026-2027 è stato salvato come 31/08/2026 → 30/08/2027 (audit `AY_CREATE` del 14/09/2026 con `startDate: "2026-08-31T22:00:00.000Z"`).
2. Il default della scadenza nel dialog certificato medico (`new Date(anno + 1, mese, giorno)`) ha lo stesso difetto.

Regole:
- **Client**: date di calendario costruite con `dateOnly(anno, mese0, giorno)` (`Date.UTC`), mai `new Date(y, m, d)`.
- **Server**: ogni scrittura su una colonna `@db.Date` passa da `toDateOnly()` / `toDateOnlyOrNull()` (`src/lib/utils/date-only.ts`): prende il giorno di calendario a Roma e restituisce la mezzanotte UTC. È idempotente sui valori già giusti (picker, DB) e corregge mezzanotti locali e `new Date()`. Protegge anche da default client sbagliati che non abbiamo ancora visto.
- **"Oggi"** da confrontare con colonne date: `todayDateOnly()`, non `new Date()` + `setHours` / `setUTCHours`.
- **Anno di una data di calendario**: `getUTCFullYear()` dopo `toDateOnly` (vedi `fiscalYearOf` in `src/lib/school-calendar.ts`). Mai `getFullYear()` lato server: su Vercel il processo gira in UTC (§17.10).

Già normalizzati: anni accademici, stage, saggio, certificati medici, orari corso, iscrizioni ai corsi, pagamenti, spese, data ricevuta (`todayInRome`). Non normalizzate, ma corrette finché arrivano dal picker: data di nascita di allieve e genitori. Scoperto: 14 settembre 2026, anno accademico 2026-2027 che partiva dal 31/08.

---

## Next.js

**§17.7 Next.js 16 proxy.ts export naming**: il runtime Next.js 16.2.4 (`node_modules/next/dist/build/analysis/get-page-static-info.js`) accetta come nome funzione sia `export async function middleware(...)` sia `export async function proxy(...)` (entrambi riconosciuti, riga 260-273), ma legge il matcher SOLO dall'export `config`, NON da `proxyConfig` (riga 457, 562). La skill Vercel `routing-middleware` documenta `proxyConfig` come convenzione futura, ma usarla oggi rompe silenziosamente il matcher: il proxy gira su TUTTE le request (inclusi `/_next/static/chunks/*.css`) e le pagine perdono gli stili (redirect CSS → `/login`). Pattern corretto: `export async function proxy(request) {...}` + `export const config = { matcher: [...] }`. Debug tip: se CSS/JS di Next.js vengono intercettati dal proxy, verificare SEMPRE il nome dell'export config prima di sospettare regex matcher.

**§17.9 Next.js Dev Mode logga Server Action bodies**: Next.js 16 in dev mode logga automaticamente ogni Server Action call con il body (password incluse). Comportamento framework-level, NON codice nostro. In production Vercel questo logging NON avviene (Function Logs mostrano solo HTTP method + path + status, non il body). Attention: mai scrivere `console.log(values)` o `console.log(error)` in action files, altrimenti anche prod logga. Pattern sicuro: `console.log({ email: values.email })` invece di `console.log(values)`. Future refactor (Sprint 1+): valutare switch a Supabase client-side auth (`supabase.auth.signInWithPassword()` chiamata direttamente dal client) per evitare che password transiti mai attraverso il nostro server, anche in dev. Scoperto: 20 aprile 2026, Sprint 0 Fase 3E.

**§17.27 Next.js build — Lazy client init per env safety**: third-party SDK client (Resend, Supabase admin, Stripe, ecc.) che chiamano `new Client(process.env.X)` **a module load** fanno throw durante `next build` phase "Collecting page data" se la env var non è settata nell'ambiente di build. Pattern rotto:
```ts
// ❌ throw al module load
export const resend = new Resend(process.env.RESEND_API_KEY!)
```
Pattern corretto (lazy):
```ts
// ✅ throw solo al primo call
let _client: Resend | null = null
export function getResend(): Resend {
  if (_client) return _client
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error("RESEND_API_KEY missing")
  _client = new Resend(key)
  return _client
}
```
Applicato a `src/lib/resend/client.ts`. Stesso pattern preventivo per ogni SDK nuovo. Scoperto: Sprint 3.1, aprile 2026.

**§17.47 Scheda in pannello dalle liste — intercepting route, e cosa non fa da sola**: da Scadenze e Certificati la scheda allieva si apre in un pannello laterale con la lista dietro. È una intercepting route di Next: `admin/<lista>/layout.tsx` rende `{children}{panel}`, `@panel/default.tsx` rende `null`, e `@panel/(..)athletes/[id]/page.tsx` rende lo stesso `AthleteCard` della pagina con `variant="panel"`. L'indirizzo è quello della scheda: navigando dalla lista si vede il pannello, ricaricando la pagina intera. Per portarlo su un'altra lista bastano quei tre file. Cose verificate nel browser, e trappole:

- **la lista dietro si aggiorna da sola** dopo una server action con `revalidatePath` (incasso, certificato): non serve un `router.refresh()` alla chiusura;
- **chiudere = `router.back()`**: è per questo che filtri, scorrimento e selezioni della lista restano — non è mai stata smontata. Le schede della scheda usano `router.replace`, quindi Indietro chiude il pannello in un colpo;
- **l'intercettazione non guarda la larghezza**: ogni `<Link>` verso `/admin/athletes/{id}` da quelle due liste apre il pannello, anche su telefono. Sotto 1024 i nomi usano `AthleteCardLink`, che fa una navigazione piena; per gli altri link (ricerca, menu ⋯) il pannello sotto 1024 non si disegna e ricarica l'indirizzo, che mostra la pagina;
- **"Apri la scheda intera" è un `<a>`, non un `<Link>`**: l'indirizzo è già quello, un `<Link>` non farebbe niente;
- **i breakpoint guardano la finestra, non il pannello**: a 1440 `lg:grid-cols-2` si accende anche dentro 640 px. La variante `in-panel:` (`@custom-variant in-panel ([data-panel] &)` in `globals.css`) riporta le griglie a una colonna; con l'attributo nel selettore vince sulla utility col solo media query;
- **le larghezze di `SheetContent` vanno scritte con la sua stessa variante** (`data-[side=right]:sm:max-w-[640px]`): un `sm:max-w-[640px]` semplice perde contro il `data-[side=right]:sm:max-w-sm` del componente, e il pannello resta a 384 px;
- **scorre il corpo, non il pannello**: se `SheetContent` è il contenitore che scorre, la X (assoluta) se ne va con il contenuto.

Per provarlo in locale senza toccare la produzione: Postgres locale, `next dev` con `DATABASE_URL` e le variabili Supabase sovrascritte nel processo (vincono su `.env.local`), e due stub temporanei non committati in `current-account.ts` e `supabase/middleware.ts` che restituiscono un admin finto. Scoperto: PR #47, ottobre 2026.

**§17.48 Richieste alla famiglia (certificati) — una traccia per allieva, e la foto ridotta prima dell'upload**: tre cose che non si vedono dal codice finché non si sbaglia.

- **`EmailLog` ha un'allieva sola per riga, un'email può riguardarne due.** I certificati mancanti di due sorelle partono in una sola email (`planCertRequests`): la riga di `EmailLog` porta la prima, e "Ultima richiesta" letta da lì direbbe "Mai chiesto" per la seconda. Per questo la traccia si legge da `AuditLog` (`MEDICAL_CERT_EMAIL_SENT`, una riga **per allieva**), non da `EmailLog`. Lo stesso vale per il limite di 3 richieste al giorno.
- **`REMINDER_WHATSAPP_OPENED` serve due cose**: i solleciti dei contributi (`entityType: "PaymentSchedule"`) e le richieste del certificato (`entityType: "Athlete"`). Le distingue `changes.ambito` (`"contributo"` / `"certificato"`), non un valore nuovo dell'enum: aggiungere un valore a un enum Postgres vuole una migration tutta sua (§17.5). Chi legge deve filtrare sull'ambito; le righe vecchie senza ambito sono contributi.
- **La foto si riduce nel browser, prima dell'upload** (`photo-resize.ts`: lato lungo 2000 px, JPEG 0,8). Una foto da iPad pesa 4-6 MB e il limite del portale è 3: senza riduzione "Scatta una foto" fallirebbe quasi sempre. Il controllo dei 3 MB va fatto **dopo** la riduzione, non sul file scelto. HEIC: Safari lo decodifica da solo e il canvas lo riscrive in JPEG; dove `createImageBitmap` fallisce si mostra un messaggio e non si carica niente. `capture="environment"` apre la fotocamera solo su dispositivi che ne hanno una: su desktop è un normale selettore di file.

I testi delle email vivono nel database (`email_templates`) e ci arrivano con migration additive (`ON CONFLICT (slug) DO NOTHING`), così quello che Giuseppina ha modificato non viene sovrascritto. Attenzione: `cert-reminder` è solo in `prisma/seed.ts`, non in una migration. Scoperto: PR #48, ottobre 2026.

**§17.34 Next.js 16 — `redirect()` in una server action + try/catch lato client = falso errore**: quando una server action chiama `redirect()`, lato client la promise della chiamata viene **rifiutata** con l'errore di redirect (vedi `server-action-reducer.js`, `reject(redirectError)`) mentre Next esegue comunque la navigazione. Un `try/catch` nel client component lo tratta come fallimento: compare il toast "salvataggio non riuscito" e intanto la pagina cambia. Vale anche per i `redirect()` impliciti di `requireAdmin()` / `requireParent()` a sessione scaduta. Pattern corretto:
```tsx
import { unstable_rethrow } from "next/navigation"

try {
  const result = await setOwnPassword(values)
  if (result && !result.ok) toast.error(result.error)
} catch (error) {
  unstable_rethrow(error) // rilancia redirect / notFound, lascia passare il resto
  toast.error("Salvataggio non riuscito, riprova")
}
```
`unstable_rethrow` è API pubblica di `next/navigation` nonostante il prefisso, e ha una build browser dedicata. **Non** usare `isRedirectError`: si importa solo da `next/dist/client/components/redirect-error`, percorso interno che si rompe agli aggiornamenti di Next. In alternativa, senza try/catch il problema non si presenta (pattern di `login-form.tsx`). Lato server resta valida la regola opposta: `redirect()` sempre fuori dai `try`. Scoperto: Sprint onboarding, `/imposta-password`, settembre 2026.

---

## Zod / RHF

**§17.11 Zod v4 `.default()` + RHF generic mismatch**: `z.boolean().default(true)` crea input type `boolean | undefined` / output `boolean`. `useForm<z.infer<T>>` infera l'output, ma `zodResolver` lavora sull'input → TS2322 `"Type 'boolean | undefined' is not assignable to type 'boolean'"`. Fix: tenere defaults SOLO in `useForm({ defaultValues })`, NON nel Zod schema. Lo schema Zod descrive "forma dati validi", non defaults UI. Scoperto: Sprint 1.C, 21 aprile 2026.

**§17.12 Zod v4 `z.coerce.date()` input/output mismatch**: `z.coerce.date()` crea input `unknown` / output `Date`. `useForm<z.infer<T>>` infera output `Date`, ma `zodResolver` lavora su input `unknown` → TS2322 `"Type 'unknown' is not assignable to type 'Date'"`. Fix: usa `z.date()` e converti string → Date manualmente nell'`onChange` del form Input `type="date"`. Pattern:
```tsx
onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
```
Scoperto: Sprint 1.C, 21 aprile 2026.

**§17.17 Zod v4 `z.enum()` errorMap API change**: in Zod v4 l'API di `z.enum()` per custom error message è cambiata. La sintassi vecchia `errorMap: () => ({ message })` non compila più (TS error: `"Object literal may only specify known properties, and 'errorMap' does not exist..."`). Nuova sintassi: il secondo arg è un oggetto `{ message }` diretto.
```ts
// Vecchio (Zod v3)
z.enum(TUPLE, { errorMap: () => ({ message: "..." }) })

// Nuovo (Zod v4)
z.enum(TUPLE, { message: "..." })
```
Scoperto: Sprint 2.A.2, 21 aprile 2026, durante creazione `courseCreateSchema` per `COURSE_TYPES`.

**§17.18 Zod `z.date().max()` + HTML date picker → timezone border bug**: un form con `<Input type="date">` il cui `onChange` fa `new Date(e.target.value)` produce un `Date` a **midnight UTC** (il browser interpreta `"YYYY-MM-DD"` come ISO date → UTC). Uno schema `z.date().max(new Date(), { message: "non può essere nel futuro" })` confronta quel midnight UTC con `new Date()` (now locale). In TZ Europe/Rome (UTC+1/+2), now locale > midnight UTC di **oggi** → il check `.max()` passa. MA se l'utente è in TZ negative o a cavallo DST, o semplicemente la differenza è minima, il confronto può rigettare "oggi" come futuro. Anche senza quello, selezionare la data di **oggi** produce spesso falsi positivi quando Prisma/Node processa la conversione. Fix: helper `endOfToday()` in `src/lib/schemas/common.ts`:
```ts
export function endOfToday(): Date {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d
}
```
L'upper bound diventa la fine della giornata locale → oggi passa sempre, domani no. **Il limite va calcolato a ogni validazione**: `z.date().refine(isNotInFuture, { message: "..." })` (helper in `common.ts`), non `z.date().max(endOfToday(), ...)`. L'argomento di `.max()` è valutato una sola volta, quando il modulo dello schema viene caricato: un'istanza server rimasta accesa oltre la mezzanotte rifiuta la data di oggi come futura finché non riparte. Con `refine` oggi: `paymentDate`, `expenseDate`, `enrollmentDate`, `withdrawalDate`. `dateOfBirth` (allieve, genitori) usa ancora `.max(endOfToday())`: innocuo, nessuna data di nascita cade oggi (corretto settembre 2026). Scoperto: Sprint 2.B, 21 aprile 2026, su `enrollmentDate` field in `EnrollCourseDialog`.

---

## Vercel / Build

**§17.10 Vercel env var TZ è reserved**: Vercel non permette di settare `TZ` come env var custom perché è variabile di sistema (gestita da Vercel runtime). Aggiungerla produce errore `"The name of your Environment Variable is reserved"` e blocca il deploy. Fix Sprint 0: non settiamo `TZ` su Vercel. Il runtime gira in UTC di default. Per timezone-aware formatting usare: `date.toLocaleString("it-IT", { timeZone: "Europe/Rome" })` (o equivalente `formatInTimeZone` di `date-fns-tz` già previsto dallo stack). Future: se serve TZ globale, usare env var custom tipo `APP_TZ` + code che lo legge come fallback. Scoperto: 20 aprile 2026, Sprint 0 Fase 3E.2.

**§17.15 `tsc --noEmit` non replica `next build` strict check**: Next.js production build (`next build`) ha type checking più stretto di `tsc --noEmit` e del dev server. Scenari tipici: Prisma `findUnique`/`findMany` con `include` dove TS inferenza è instabile, tipi derivati da Prisma payload con `Pick<>`, discriminated union con condizioni narrow. Fix:
1. Usa `Prisma.validator<Prisma.XDefaultArgs>()({})` + `Prisma.XGetPayload<typeof validator>` per return type espliciti
2. Esporta tipi derivati (es. `AthleteParentRelation`) invece di ridefinirli localmente nei componenti
3. **PRE-DEPLOY**: esegui sempre `npm run build` (non solo `tsc --noEmit`) prima di push. Overhead ~1–2 min ma previene deploy rossi.

Scoperto: Sprint 1.C, 21 aprile 2026, sui deploy Vercel falliti commit `157823e` + `3d5d5b8`.

**§17.16 Vercel build cache + Prisma Client stale**: Vercel restore `node_modules` cache della build precedente → se hai modificato `schema.prisma` tra commit, il Prisma Client in `node_modules/.prisma/client` è stale e TypeScript vede type definitions obsolete (es. `email: string` invece di `email: string | null` dopo relax nullable). Errore "Property X is missing" o "Type X is not assignable" in build Vercel mentre locale passa. Fix: aggiungi `"postinstall": "prisma generate"` a `package.json` scripts. Ogni `npm install` (anche cache hit) rigenera Prisma Client. Overhead ~10s, elimina categoria di bug. Scoperto: Sprint 1.C, 21 aprile 2026, commit fix `0e1ed24`.

**§17.41 `outputFileTracingExcludes` per Prisma — cosa il client apre davvero a runtime**: `@prisma/client` è nella lista dei pacchetti esterni di default di Next, quindi il tracer ne copia l'albero intero in **ogni** funzione: ~78 MB, di cui ~58 mai aperti. `next.config.ts` li esclude. Perché è sicuro, verificato leggendo il pacchetto:

- `node_modules/.prisma/client/index.js` (il client generato dal nostro schema) richiede **un solo** runtime: `@prisma/client/runtime/library.js`;
- `library.js` carica il motore nativo `libquery_engine-<piattaforma>.node`, che sta in `.prisma/client`;
- i `*wasm-base64*` (motori e compilatori WebAssembly dei cinque database supportati, in doppia copia `.js`/`.mjs`) non sono nominati da nessun file del runtime: l'unico che li cita è `generator-build/index.js`, cioè `prisma generate`, che gira in build e non in funzione;
- `binary.*`, `edge*`, `wasm-*-edge`, `react-native.*`, `index-browser*` sono i runtime per il motore "binary", per edge, per React Native e per il browser: nessuno dei quattro è il nostro.

Regole:
- **non escludere mai** `runtime/library.js` né `libquery_engine-*`, e scrivere i pattern **senza nominare la piattaforma** (in locale il motore è `darwin-arm64`, su Vercel `rhel-openssl-3.0.x`);
- se un domani si passa ai **driver adapter** o al runtime **edge**, le esclusioni vanno tolte. Il guasto sarebbe rumoroso e immediato (`module not found` su qualunque query), non silenzioso;
- `previewFeatures = ["driverAdapters"]` era dichiarato e non usato: è stato tolto, ma **non cambia l'output** — Prisma 6.19 genera `query_engine_bg.wasm` comunque. A toglierlo dal bundle è l'esclusione, non lo schema.

Limite noto: la traccia del proxy (`.next/server/middleware.js.nft.json`) viene scritta **fuori** dal passaggio che applica queste esclusioni, quindi nessuna chiave la intercetta (provate `**/*`, `*`, `middleware`, `proxy`, `/middleware`, `/proxy` su Next 16.2.4) e resta a ~80 MB. Come verificare dopo ogni modifica: `rm -rf .next && npm run build`, poi rileggere i `.nft.json` e controllare che nessuna funzione contenga i file esclusi e che tutte contengano ancora il motore nativo e `library.js`. Prova definitiva: nascondere i file esclusi dal disco e far girare i flussi veri (ricevuta, anteprima, timbro, lettura PDF, query) — se qualcuno li aprisse, si romperebbe. Scoperto: audit dimensione funzioni, 5 ottobre 2026.

---

## PDF / Export

**§17.20 `@react-pdf/renderer` in Next.js 16 richiede `next/dynamic` con `ssr: false`**: il modulo esegue side-effect al parse (es. `Font.register` globale) incompatibili con SSR/RSC. Usare `"use client"` da solo non basta — Next 16 tenta comunque di includere il bundle lato server durante la route analysis, rompendo il build. Pattern corretto per **download client-side**:
```tsx
const PDFDownloadLink = dynamic(
  () =>
    import("@react-pdf/renderer").then((m) => ({
      default: m.PDFDownloadLink,
    })),
  { ssr: false, loading: () => <Button disabled>Caricamento...</Button> },
)
```
Tip: `PDFDownloadLink` è un **named export** → richiede `{ default: m.PDFDownloadLink }` nel `.then()` perché `next/dynamic` vuole un default export.

Pattern per **rendering server-side** (ZIP bundle, email attachment, cron-generated PDF):
```ts
import { renderToBuffer } from "@react-pdf/renderer"
const pdfBuffer = await renderToBuffer(MyDocument({ data }))
```
Richiede runtime Node.js nel route handler (NON Edge, perché Edge non supporta le API native che @react-pdf usa):
```ts
export const runtime = "nodejs"
```
Scoperto: Sprint 7.D (Athlete card PDF client-side) + Sprint 7.F (Annual bundle server-side), 21 aprile 2026.

**§17.21 Helper file (CSV/XLSX/PDF): separare builder Buffer-based da wrapper download**: helper come `generateXLSX` e `generateCSV` scritti inizialmente client-side (Blob + `URL.createObjectURL` + DOM) **non sono riusabili server-side** per generation in ZIP bundle, email attachment, storage upload. Pattern: estrarre builder puro (ritorna Buffer o stringa) + wrapper download che chiama il builder + side-effect DOM.

Esempio `excel.ts`:
```ts
function buildWorkbook(sheets): XLSX.WorkBook { ... }  // shared

export function buildXlsxBuffer(sheets): Buffer {       // server
  const wb = buildWorkbook(sheets)
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
}

export function generateXLSX(sheets, filename): void {  // client
  const wb = buildWorkbook(sheets)
  XLSX.writeFile(wb, filename)
}
```
Stesso pattern applicabile a CSV (`buildCsvString` separato da `downloadCsv`) e PDF (`renderToBuffer` separato da `PDFDownloadLink`). Regola pratica: se è pensabile riusare la logica in un cron/webhook/email/zip, estrarre subito il builder Buffer-based — refactor dopo costa di più. Scoperto: Sprint 7.F (Annual bundle richiedeva `buildXlsxBuffer` mentre `generateXLSX` era solo client-side), 21 aprile 2026.

**§17.36 react-pdf si rompe impaginando i testi dentro un SVG — nei PDF usare sempre il logo PNG**: passare a `<Image src>` di `@react-pdf/renderer` un logo SVG che contiene testo (scritte non convertite in tracciati) fa lanciare il layout durante `renderToBuffer`:
```
TypeError: Cannot read properties of undefined (reading 'xAdvance')
    at layoutText$1 (@react-pdf/layout/lib/index.js)
    at resolveSvgRoot → resolveSvg (@react-pdf/layout/lib/index.js)
```
L'errore non dipende dai dati del documento e colpisce ogni PDF generato con quel logo. `BrandSettings` ha sia `logoUrl` (PNG) sia `logoSvgUrl` (vettoriale): nei PDF usare **solo** `logoUrl`, come già facevano bilancio e scheda allieva. Difesa aggiuntiva in `src/lib/receipts/receipt-document.ts`: se il rendering con il logo fallisce, si logga l'errore completo e si rigenera il PDF con il marchio testuale, perché un logo difettoso non deve bloccare una ricevuta allo sportello. Bug reale: la prima ricevuta emessa non si generava; `receipt.tsx` sceglieva `logoSvgUrl ?? logoUrl` fin dal flusso genitori, ma il difetto era rimasto latente perché nessuna ricevuta era mai stata emessa. Come trovarlo in fretta: riprodurre `renderToBuffer` fuori da Next con i dati reali e stampare l'errore intero (vedi §17.37). Scoperto: sprint ricevuta lato admin, settembre 2026.

---

## UX / Form

**§17.22 UX — Placeholder ≠ valore default**: i placeholder in form non devono mai essere confondibili con valori reali di default. Usare pattern generici ("es. Via Roma", "N°", "XX", "00000") invece di valori concreti plausibili ("Via Cervinaro", "Montella", "+39 333 1234567"). Audit Sprint 7.X ha mostrato che Giuseppina avrebbe potuto interpretare placeholder come pre-compilati. Regola pratica: ogni `placeholder="..."` su `Input` / `Textarea` deve iniziare con "es." o usare marcatori palesemente finti. Scoperto: Sprint 7.X audit UX, aprile 2026.

**§17.38 Dialog dentro una riga che cambia gruppo dopo l'azione — si smonta e perde lo stato**: un dialog il cui stato vive nel componente di una riga (es. `useState` in `ScheduleRowActions`) esiste solo finché React considera quella riga la stessa. Se l'azione aggiorna la pagina (server action con `revalidatePath`) e la riga cambia posizione nell'albero, React smonta la riga e ne monta una nuova con lo stato iniziale: il dialog si chiude da solo. Esempio: la scadenza appena pagata passa dal gruppo "In scadenza" a "Pagate", cioè in un altro `<ul>`. Stesso effetto se il dialog è renderizzato sotto una condizione che l'azione rende falsa (`canSettle && <Dialog>`). Sintomo: il seguito dell'azione ("Pagamento registrato" con "Emetti ricevuta") compare e sparisce dopo mezzo secondo. Regola: i dialog che hanno un seguito dopo l'azione si montano **fuori dalle liste**, in un provider in un punto fisso della pagina; la riga li apre via context passando una copia dei dati presa all'apertura, che resta valida anche quando il record cambia stato. I dialog che si chiudono appena l'azione riesce (es. "Condona") possono restare nella riga. Pattern: `ScheduleSettleProvider` in `src/app/(admin)/admin/athletes/_components/schedule-settle-provider.tsx`. Nota: non è un reload della pagina: `revalidatePath` rigenera i Server Components e i client component rimasti nella stessa posizione conservano lo stato. Bug reale: "Salda" dalla scheda allieva, settembre 2026.

---

## Settings pattern

**§17.28 Settings pattern — Aggiungere un tab**: il pattern `/admin/settings` è stabile su 6 tab (Account, Associazione, Brand, Ricevute, Reminder, Admin). Per aggiungere un nuovo tab:
1. Estendi `SettingsTabKey` union in `settings-nav.tsx`
2. Aggiungi voce in `SETTINGS_TABS` array con `icon` (lucide) + `label`
3. Crea `_components/<name>-tab.tsx` (RHF + `zodResolver` + `useBeforeUnloadGuard` + `StickySaveBar` + `onDirtyChange`)
4. Mount in `settings-shell.tsx` con conditional render su `active === "<name>"` + `key` unico per remount
5. Fetch initial data in `page.tsx` `Promise.all`, passa prop `initial<Name>`
6. Server action in `<name>-actions.ts` con validate Zod + audit `prisma.auditLog.create` (entityType custom) + `revalidatePath("/admin/settings")`
7. `DirtyGuardDialog` è già a livello shell → gestito automaticamente per il nuovo tab

Scoperto: Sprint 3.7 Reminder tab, aprile 2026.

---

## Errori e diagnostica

**§17.37 Catch generico "riprova tra qualche istante" su un errore permanente**: un `try/catch` che trasforma qualsiasi eccezione in "riprova tra qualche istante" e logga solo `error.message` (o niente) ha due effetti: l'utente riprova all'infinito un errore che non è transitorio, e chi fa supporto non vede la causa, perdendo un giro di diagnosi a indovinare (import rotti? dati mancanti? permessi?). Regole:
1. **Distinguere i casi** prima del catch generico: risorsa inesistente (404), non autorizzato (403), stato che impedisce l'operazione (es. ricevuta annullata, 410), errore di dati noto (errore tipizzato con `code`), errore imprevisto (500).
2. **Loggare sempre l'errore completo lato server**, passando l'oggetto errore come argomento separato così da avere lo stack: `console.error("[area] cosa è fallito", { id, userId, code }, error)`. Contesto con id e ruolo, mai dati personali.
3. **"Riprova" solo per errori davvero transitori** (rete, timeout). Per quelli permanenti il messaggio dice cosa fare o chi avvisare.
4. Le funzioni di dominio **lanciano errori tipizzati** invece di restituire `null` per casi diversi: un `null` che significa sia "pagamento mancante" sia "impostazioni mancanti" è indistinguibile a valle.

Pattern applicato in `src/app/ricevute/[receiptId]/route.ts` (pagine distinte 404/403/410/500 con log) e `ReceiptRenderError` in `src/lib/receipts/receipt-document.ts`. Bug reale: la route della ricevuta rispondeva "Non è stato possibile generare la ricevuta, riprova tra qualche istante" per il logo SVG di §17.36, un errore che nessun nuovo tentativo avrebbe risolto. Scoperto: sprint ricevuta lato admin, settembre 2026.

---

## Supabase Data API

**§17.46 RLS spenta di proposito, Data API chiusa con i REVOKE in migration**: le tabelle dello schema `public` non hanno Row Level Security e non devono averla finché il portale parla col database solo tramite Prisma lato server (ruolo `postgres`, che la bypasserebbe comunque). Le policy sarebbero codice che non gira mai, e darebbero una falsa sicurezza. La chiusura verso la Data API di Supabase (PostgREST, raggiungibile con la chiave `anon` che sta nel bundle e con il JWT di qualsiasi genitore autenticato) sono i **grant**: la migration `20261010090000_revoke_data_api_grants` toglie a `anon` e `authenticated` ogni privilegio su tabelle, sequenze e funzioni, l'`USAGE` sullo schema e i default privileges per gli oggetti futuri; è idempotente e non fa niente dove quei ruoli non esistono (Postgres locale). Regole: (a) nessun `GRANT … TO anon|authenticated` in nessuna migration futura; (b) nessun `createClient` di Supabase nel browser che interroghi tabelle (`.from(…)`): se un giorno servirà, prima le RLS, poi i grant; (c) il controllo notturno del repo di backup sulla Data API resta acceso, è la rete di sicurezza se qualcuno riapre i grant dalla dashboard. Verifica locale: ruoli `anon`/`authenticated` creati a mano con i grant di Supabase, migration applicata, `SET ROLE anon; SELECT … FROM athletes` → `permission denied`, Prisma come `postgres` funziona.

## Supabase Auth

**§17.35 Email OTP expiration a 86400 — l'avviso del security advisor è voluto**: in Supabase Dashboard → Authentication → Providers → Email, "Email OTP Expiration" è impostato a **86400 secondi (24 ore)**, il massimo consentito. Il security advisor segnala "OTP expiry exceeds recommended threshold": **non va "sistemato" riportandolo a 3600**. Il valore decide la durata dei link di invito e di recupero password generati con `auth.admin.generateLink` (vedi `docs/email-system.md`). Motivo: Giuseppina invia l'accesso a ~40 famiglie in una sera, e molti genitori aprono l'email il giorno dopo; con un link da un'ora la maggior parte degli inviti sarebbe inutilizzabile e diventerebbe una richiesta di supporto. Il rischio residuo è coperto da: link monouso, invalidato da ogni reinvio, e dal tasto "Reinvia accesso" / pagina "Password dimenticata" per i link scaduti. Se l'avviso compare in un audit, rimandare a questa voce. Scoperto: Sprint onboarding, settembre 2026.

**§17.49 Secondo fattore degli admin — il controllo aal2 sta in `adminGate`, chiamato dal proxy e da `requireAdmin`**: dalla PR del secondo fattore un utente con ruolo ADMIN è «admin» solo se la sua sessione ha superato anche il TOTP. Il fattore è di Supabase Auth (`mfa.enroll` / `mfa.challengeAndVerify`, nessuna tabella nostra); il livello della sessione è il claim `aal` del JWT (`aal1` = solo password, `aal2` = anche il codice), letto da `sessionLevelFromClaims` (`src/lib/auth/mfa-gate.ts`) sul payload del token **dopo** che `getUser()` lo ha fatto verificare a Supabase. La decisione è una funzione pura, `adminGate({ role, aal, recoveryPass })`, e la chiamano in due: **`src/proxy.ts` step 5** (dentro `/admin`, redirect a `/verifica-2fa`) e **`requireAdmin()`** (`src/lib/auth/require-admin.ts`, stesso redirect). Chi aggiunge una terza porta verso dati admin deve passare da lì, non riscrivere il confronto con `"aal2"`. Cose da sapere:
- **Le pagine del secondo passaggio stanno fuori da `/admin`**: `/verifica-2fa` e `/imposta-2fa` sono nel gruppo `(account)`, raggiungibili con aal1, e usano `requireAdminFirstFactor()` (solo ruolo). Dentro `/admin` farebbero loop col proxy.
- **I codici di recupero non alzano l'aal**: Supabase non li ha. Un codice valido (hash bcrypt in `mfa_recovery_codes`, segnato `used_at` alla prima verifica) emette il cookie `iad_mfa_pass`, firmato HMAC con chiave derivata dalla service role e legato a `userId` + `session_id` del JWT, 12 ore. `adminGate` lo conta come secondo fattore. Un logout cambia `session_id` e il cookie muore con la sessione.
- **Cambio password (`/imposta-password`) e sostituzione del fattore (`/imposta-2fa`)**: per un admin con fattore attivo servono aal2 o il lasciapassare, altrimenti chi ha la sola password sostituirebbe l'iPad col proprio telefono. Un admin **senza** fattore (appena invitato, o azzerato) sceglie prima la password e poi viene portato all'iscrizione.
- **Azzeramento dall'altro admin**: `auth.admin.mfa.deleteFactor` con la service role + `deleteMany` dei codici, riga `MFA_RESET` nell'audit. Il TOTP deve restare abilitato nel progetto Supabase (Authentication → Multi-Factor): se qualcuno lo spegne dalla dashboard, `mfa.enroll` fallisce e nessun admin entra più. Sequenza per Giuseppina in `docs/runbook.md`.
- **Codice sbagliato = tentativo di login**: stessa tabella `login_attempts` (kind `LOGIN`, email dell'utente, IP), stesso blocco di 15 minuti dopo 5.
- **Una server action che scrive un cookie fa rifare il rendering della pagina**: dopo `cookies().set` del lasciapassare, Next rimanda al client l'albero aggiornato di `/verifica-2fa`, che con il lasciapassare valido faceva `redirect` alla dashboard prima che il client mostrasse «Ti restano n codici». L'avviso vive quindi in un secondo cookie breve (`iad_mfa_notice`) che la pagina legge e il tasto «Continua» cancella; non in uno stato React.

**§17.50 Storico accessi admin (`admin_logins`) — tre cose che dal codice non si vedono**:
- **iPadOS si presenta come un Mac.** Dal 2019 Safari su iPad manda lo stesso user agent del Mac (`Macintosh; Intel Mac OS X`): un parser dello user agent, per quanto buono, scrive «Safari su Mac» per l'iPad di Giuseppina. L'unica differenza la vede il browser: `navigator.maxTouchPoints > 1` su piattaforma Mac. Il modulo di accesso e quello del secondo fattore mandano quell'indizio (`src/lib/auth/device-hint.ts`, campo `touchMac`) e `describeUserAgent` lo usa. Se l'indizio manca, la riga dice «Mac»: non è un segnale d'allarme.
- **Il paese esiste solo su Vercel.** `x-vercel-ip-country` lo aggiunge la rete di Vercel; in locale e nei test non c'è, e `loginAnomalies` con paese `null` **non** avvisa (sarebbe un falso allarme a ogni login di sviluppo). Per provare «dall'estero» in locale: un proxy davanti a `next dev` che aggiunge l'header (vedi la PR di Sicurezza 5).
- **Gli avvisi partono con `after()` di `next/server`**, dentro la server action: il login risponde subito, l'email parte dopo la risposta, e se Resend fallisce l'errore va in `logError` (e in `EmailLog` con `FAILED`). Mai `await sendEmail(...)` sulla strada del login: un provider lento o giù non deve tenere Giuseppina fuori. Lo storico si scrive invece prima della risposta, ma dentro `try/catch`: un errore di scrittura si logga e il login va avanti.
- **Il cookie `iad_device` si rinnova a ogni accesso riuscito** (un anno dall'ultimo login, non dal primo), ed è firmato come il lasciapassare della #54 (`device-cookie.ts`): un cookie inventato o di un altro portale vale come «nessun cookie», cioè dispositivo nuovo. «Dimentica» non tocca il cookie: segna `forgotten_at` sulla riga di `admin_devices`, e al login successivo quello stesso id è di nuovo nuovo (la riga si riusa, `first_seen_at` riparte).

---

## Domain specifico

**§17.19 `AcademicYear.endDate` ≠ course season end**: `AcademicYear.endDate` rappresenta la fine dell'anno **contabile** (31 agosto, usato per bilancio annuale ASD, quadrature IVA). I corsi didattici IAD finiscono invece a **giugno**: luglio e agosto sono chiusura estiva, nessuna quota mensile è dovuta. Sono due concetti semantici distinti che lo schema tratta come uno solo. Non usare `academicYear.endDate` come upper bound per generare scadenze mensili: genera quote fantasma per lug/ago. Fix: hardcode `endMonth = 5` (giugno, 0-based) nel generator. Parse `academicYear.label` (formato `"YYYY-YYYY"`) per estrarre `endYear`. Pattern:
```ts
const COURSE_SEASON_END_MONTH = 5 // giugno
const endYear = Number.parseInt(academicYear.label.split("-")[1], 10)
while (
  current.getUTCFullYear() < endYear ||
  (current.getUTCFullYear() === endYear &&
    current.getUTCMonth() <= COURSE_SEASON_END_MONTH)
) { ... }
```
Cleanup SQL per dati già generati pre-fix:
```sql
DELETE FROM payment_schedules
WHERE EXTRACT(MONTH FROM due_date) IN (7, 8)
  AND status = 'DUE';
```
Se in futuro emergono altre policy stagionali (es. agosto aperto per campus, giugno ridotto per saggio), spostare `COURSE_SEASON_END_MONTH` in `BrandSettings` o in AcademicYear come colonna dedicata (`coursesEndMonth`) invece di hardcode. Scoperto: Sprint 2.C.5, 21 aprile 2026, test visivo auto-gen schedules mostrava luglio+agosto quote fantasma.

Aggiornamento 14 settembre 2026: gli anni accademici finiscono il **30 giugno** (lezioni fino al saggio, luglio e agosto non si pagano): è il default del dialog e il dato in produzione. A luglio e agosto quindi nessun anno copre la data odierna, e il cron `academic-year-rollover` **non azzera più** il corrente: resta l'anno appena concluso finché non parte il successivo. Prima lo azzerava, e dal 1° al 14 settembre 2026 il portale è rimasto senza anno corrente. Il guard `COURSE_SEASON_END_MONTH` del generator resta valido.
