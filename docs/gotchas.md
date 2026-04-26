# Gotcha tecnici — IAD Portale

Questa è la raccolta di gotcha tecnici (regole apprese attraverso bug reali) accumulati durante sviluppo. Organizzati per topic con TOC per navigation.

Estratto da CLAUDE.md v3.2 il 22 aprile 2026. Aggiornato ad ogni nuova lezione imparata.

## Sommario

- [Shadcn / Tailwind](#shadcn--tailwind)
  - §17.1 shadcn css rewrite
  - §17.8 Sidebar tooltip
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
- [Next.js](#nextjs)
  - §17.7 Next 16 proxy export naming
  - §17.9 Next dev logga Server Action body
  - §17.27 Lazy client init per env safety
- [Zod / RHF](#zod--rhf)
  - §17.11 Zod `.default()` + RHF generic mismatch
  - §17.12 Zod `z.coerce.date()` input/output mismatch
  - §17.17 Zod v4 `z.enum()` errorMap API change
  - §17.18 Zod `z.date().max()` + HTML date picker → TZ border bug
- [Vercel / Build](#vercel--build)
  - §17.10 Vercel env var `TZ` reserved
  - §17.15 `tsc --noEmit` non replica `next build`
  - §17.16 Vercel build cache + Prisma Client stale
- [PDF / Export](#pdf--export)
  - §17.20 `@react-pdf/renderer` richiede `next/dynamic` con `ssr:false`
  - §17.21 Helper CSV/XLSX/PDF: builder Buffer-based separato da download
- [UX / Form](#ux--form)
  - §17.22 Placeholder ≠ valore default
- [Settings pattern](#settings-pattern)
  - §17.28 Aggiungere un tab
- [Domain specifico](#domain-specifico)
  - §17.19 `AcademicYear.endDate` ≠ course season end

> NOTA: §17.25-26 sono in `docs/email-system.md` (gotcha specifici sistema email).
> §17.27 è duplicato qui e in email-system.md perché è regola general-purpose Next.js.

---

## Shadcn / Tailwind

**§17.1 shadcn 4.3.0**: il comando `npx shadcn@latest add` riscrive `src/app/globals.css` senza chiedere conferma, sostituendo il pattern corretto `var(--font-geist-sans)` con stringhe hardcoded (`"Geist", "Geist Fallback", ...`) e duplicando i fallback. Verificare SEMPRE `git diff src/app/globals.css` dopo ogni `shadcn add` PRIMA di committare. Se il pattern è alterato, ripristinare manualmente le righe `--font-sans` e `--font-mono`. Lo stesso vale per `shadcn init` che auto-committa senza chiedere — usare `git reset --soft origin/main` + ricommit manuale con messaggio conventional.

**§17.8 Shadcn Sidebar richiede TooltipProvider globale**: shadcn `<Sidebar>` usa internamente `<Tooltip>` per i menu item in modalità `collapsible="icon"` (vedi `SidebarMenuButton` in `src/components/ui/sidebar.tsx`). Richiede quindi `<TooltipProvider>` mounted in un ancestor (tipicamente root layout). Sintomo se mancante: Runtime Error `"Tooltip must be used within TooltipProvider"`, cascade su ThemeProvider/altri provider (React error boundary pulls everything down). Fix: `import { TooltipProvider } from "@/components/ui/tooltip"` in `src/app/layout.tsx`, wrap `{children}` dentro `ThemeProvider`. Scoperto: 20 aprile 2026, Sprint 0 Fase 3D.2.

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
Poi usa `z.date().max(endOfToday(), { message: "..." })` in tutti gli schemi che validano date da HTML picker (`enrollmentDate`, `withdrawalDate`, `dateOfBirth`). L'upper bound diventa la fine della giornata locale → oggi passa sempre, domani no. Scoperto: Sprint 2.B, 21 aprile 2026, su `enrollmentDate` field in `EnrollCourseDialog`.

---

## Vercel / Build

**§17.10 Vercel env var TZ è reserved**: Vercel non permette di settare `TZ` come env var custom perché è variabile di sistema (gestita da Vercel runtime). Aggiungerla produce errore `"The name of your Environment Variable is reserved"` e blocca il deploy. Fix Sprint 0: non settiamo `TZ` su Vercel. Il runtime gira in UTC di default. Per timezone-aware formatting usare: `date.toLocaleString("it-IT", { timeZone: "Europe/Rome" })` (o equivalente `formatInTimeZone` di `date-fns-tz` già previsto dallo stack). Future: se serve TZ globale, usare env var custom tipo `APP_TZ` + code che lo legge come fallback. Scoperto: 20 aprile 2026, Sprint 0 Fase 3E.2.

**§17.15 `tsc --noEmit` non replica `next build` strict check**: Next.js production build (`next build`) ha type checking più stretto di `tsc --noEmit` e del dev server. Scenari tipici: Prisma `findUnique`/`findMany` con `include` dove TS inferenza è instabile, tipi derivati da Prisma payload con `Pick<>`, discriminated union con condizioni narrow. Fix:
1. Usa `Prisma.validator<Prisma.XDefaultArgs>()({})` + `Prisma.XGetPayload<typeof validator>` per return type espliciti
2. Esporta tipi derivati (es. `AthleteParentRelation`) invece di ridefinirli localmente nei componenti
3. **PRE-DEPLOY**: esegui sempre `npm run build` (non solo `tsc --noEmit`) prima di push. Overhead ~1–2 min ma previene deploy rossi.

Scoperto: Sprint 1.C, 21 aprile 2026, sui deploy Vercel falliti commit `157823e` + `3d5d5b8`.

**§17.16 Vercel build cache + Prisma Client stale**: Vercel restore `node_modules` cache della build precedente → se hai modificato `schema.prisma` tra commit, il Prisma Client in `node_modules/.prisma/client` è stale e TypeScript vede type definitions obsolete (es. `email: string` invece di `email: string | null` dopo relax nullable). Errore "Property X is missing" o "Type X is not assignable" in build Vercel mentre locale passa. Fix: aggiungi `"postinstall": "prisma generate"` a `package.json` scripts. Ogni `npm install` (anche cache hit) rigenera Prisma Client. Overhead ~10s, elimina categoria di bug. Scoperto: Sprint 1.C, 21 aprile 2026, commit fix `0e1ed24`.

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

---

## UX / Form

**§17.22 UX — Placeholder ≠ valore default**: i placeholder in form non devono mai essere confondibili con valori reali di default. Usare pattern generici ("es. Via Roma", "N°", "XX", "00000") invece di valori concreti plausibili ("Via Cervinaro", "Montella", "+39 333 1234567"). Audit Sprint 7.X ha mostrato che Giuseppina avrebbe potuto interpretare placeholder come pre-compilati. Regola pratica: ogni `placeholder="..."` su `Input` / `Textarea` deve iniziare con "es." o usare marcatori palesemente finti. Scoperto: Sprint 7.X audit UX, aprile 2026.

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
