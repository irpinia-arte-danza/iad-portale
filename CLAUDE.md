# CLAUDE.md — Contesto progetto IAD Portale

> Questo file è letto automaticamente da Claude Code a ogni sessione.
> Contiene tutto il contesto stabile del progetto: dominio, stack, convenzioni, vincoli.
> Se una regola cambia, aggiorna **questo file prima** del codice.

---

## 🎯 Missione del progetto

**IAD Portale** è il gestionale web della **A.S.D. IAD Irpinia Arte Danza** (Montella, AV), una scuola di danza con ~64 iscritte (target 100 nel 2026/27).

**Dominio di produzione**: https://area.irpiniaartedanza.it

Il gestionale sostituisce il lavoro manuale della titolare **Giuseppina Ciociola** (oggi scrive ricevute a mano, gestisce contabilità su Drive, e tutto il resto in cartaceo) e fornisce ai **genitori** un'area riservata per consultare pagamenti, presenze dei figli, scadenze e iscriversi a stage/saggio.

**Obiettivo primario**: ridurre il lavoro manuale di Giuseppina (ricevute, contabilità, tesseramenti), automatizzare le comunicazioni coi genitori, tenere la contabilità sotto controllo.

---

## 👥 Utenti del sistema

| Ruolo | Chi | Cosa fa |
|---|---|---|
| **Admin** | Giuseppina (titolare) | Tutto: anagrafiche, presenze, pagamenti, ricevute, contabilità, reportistica, impostazioni |
| **Teacher** | Insegnanti (es. aiutante di Giuseppina) | Interfaccia minimale: vede calendario proprio, segna presenze, consulta anagrafica alunne del suo corso |
| **Parent** | Genitori/tutori | Area riservata self-service (vedi permessi sotto) |

⚠️ **Non c'è ruolo "Atleta"** nell'auth. Le atlete sono **entità anagrafiche**, non utenti che fanno login. Chi fa login è il **genitore** (o l'atleta stessa se maggiorenne).

### Permessi Genitore — cosa PUÒ fare
- Iscriversi agli **stage** e pagare relativa quota
- Iscriversi al **saggio** e pagare quote partecipazione + costumi/accessori
- (V2) Pagare tramite link SumUp
- Ricevere comunicazioni dall'admin (email, broadcast)
- Vedere **calendario lezioni** dei propri figli
- Vedere **presenze/assenze** dei propri figli
- Vedere **storico pagamenti** e scaricare ricevute PDF
- Vedere **quote in sospeso**
- **Gestire dati anagrafici** propri e dei figli (aggiornare indirizzo, telefono, ecc.)
- Iscrivere i figli ai **corsi** a inizio anno accademico
- Avere **più figli associati** al proprio account

### Permessi Genitore — cosa NON PUÒ fare
- **Giustificare assenze** (non serve: vale la regola "non recuperi, non rimborsi")
- **Comunicare con gli insegnanti** (comunicazione solo unidirezionale da admin)
- Revocare consensi di altri (solo i propri)

### Permessi Insegnante
- Vede **solo** i corsi a cui è assegnata
- Segna **presenze** delle sue alunne
- Consulta anagrafica alunne del proprio corso (no contatti genitori sensibili, no dati finanziari)
- Non accede a: pagamenti, contabilità, impostazioni, altri corsi

---

## 🏛️ Contesto dominio: cos'è una ASD e cosa deve rispettare il gestionale

Una **Associazione Sportiva Dilettantistica (ASD)** è regolata in Italia da normative specifiche. Queste regole **guidano il modello dati** e vanno rispettate sempre.

### Doppia chiave temporale: anno accademico + anno fiscale
È una delle feature architetturali più importanti:

- **Anno accademico** (settembre → giugno/agosto): iscrizioni, corsi, saggio, tesseramenti, quote frequenza, statistiche iscritti
- **Anno fiscale** (1 gennaio → 31 dicembre): contabilità, bilancio, compensi, ricevute, F24, report per il commercialista

Ogni **movimento contabile** (entrata o uscita) viene associato **automaticamente a entrambi** in modo che:
- `Finanze › Movimenti 2026` (fiscale) mostra tutto dall'1/1 al 31/12
- `Dashboard › Anno 2025-2026` (accademico) mostra tutto da settembre 2025 a giugno 2026

### Iscrizione a socio
Non è un "cliente": è un **socio** dell'ASD. L'iscrizione richiede:
1. Compilazione modulo (cartaceo o online)
2. Quota associativa annuale (comprende tesseramento + assicurazione)
3. 5 consensi obbligatori (vedi sotto)
4. Certificato medico di idoneità sportiva non agonistica (in corso di validità)

### 5 consensi obbligatori
Ogni socio deve accettare:
1. **Regolamento ASD** (cambia ogni anno — versionato!)
2. **Condizioni di recesso** (quote non rimborsabili)
3. **Liberatoria foto/video** (revocabile in qualsiasi momento)
4. **Condizioni di pagamento** (entro il 10 del mese)
5. **Trattamento dati personali GDPR**

Ogni consenso è salvato con: `acceptedAt`, `documentVersion`, `ipAddress` (se online).

### Quote
- **Quota associativa annuale**: una tantum, non rimborsabile
- **Quota di frequenza**: mensile o trimestrale, scadenza **giorno configurabile** (default 10)
- **Quota stage**: per singolo stage, pagata all'iscrizione
- **Quota saggio**: in 2 rate (entro gennaio + entro aprile)
- **Costumi/accessori saggio**: pagamento separato, per atleta

### Tesseramenti (Endas / CSEN)
IAD è affiliata a **Endas** e **CSEN**. Entrambi gli enti **non hanno API pubbliche**.

Il flusso operativo è:
1. Ogni nuovo iscritto va tesserato tramite portale dell'ente (Endas RAU, CSEN portale)
2. Giuseppina manda al **referente** dell'ente un **PDF con i dati degli iscritti da tesserare**
3. Il referente carica lui i tesserati sul portale

Il sistema quindi:
- Genera **PDF export iscritti per tesseramento** (sia Endas che CSEN), formato tabellare con dati anagrafici necessari
- Traccia data tesseramento + ente + numero tessera (quando ricevuta indietro)
- Alert su tesseramenti mancanti (blocca accesso lezioni finché non tesserati? configurabile)

### Regole di business critiche (dal regolamento 2025/2026)
- Mancato pagamento → **sospensione accesso + sospensione copertura assicurativa** (alert!)
- Assenze **non recuperate** né rimborsate
- Certificato medico **scaduto** → accesso bloccato
- Quote **non rimborsabili** in nessun caso

### Interpretazione A — cartaceo e online convivono
I moduli cartacei IAD restano validi. Giuseppina li riceve firmati e li digitalizza nel sistema. In parallelo, un form online permette iscrizioni native digitali. **Entrambi atterrano nello stesso database.**

---

## 🗂️ Entità core del modello dati

Vedi `prisma/schema.prisma` per lo schema completo. In sintesi:

**Anagrafica**: `User` (auth) → `Parent`, `Athlete`, `Teacher` (profili)
**Organizzazione**: `AcademicYear`, `FiscalYear`, `Course`, `CourseEnrollment`, `Lesson`, `Attendance`
**Eventi speciali**: `Stage`, `StageEnrollment`, `Showcase`, `ShowcaseParticipation`, `Costume`
**Finanza**:
- `Payment` (entrata: quote, stage, saggio, costumi)
- `Expense` (uscita: affitto, F24, utenze, compensi, altro)
- `CashflowEntry` (vista unificata entrate+uscite)
- `Receipt` (numerazione differenziata: quote / saggio / prestazione)
- `TeacherCompensation` (compensi sportivi con soglia €15.000 monitorata)
**Compliance**: `MedicalCertificate`, `Insurance`, `Consent` (versionato), `LegalDocument`, `Document` (scansioni moduli), `Affiliation` (Endas/CSEN)
**Comunicazione**: `EmailLog`, `ReminderConfig` (config solleciti globale + per-genitore override)
**Impostazioni**: `BrandSettings` (logo caricabile, colori, dati ASD)
**Security**: `AuditLog`

---

## 🛠️ Stack tecnologico

| Layer | Tecnologia | Motivo |
|---|---|---|
| Framework | **Next.js 16** | App Router + Server Components + React 19 (route protection via `src/proxy.ts`, nome Next 16 al posto del vecchio `middleware.ts`) |
| Linguaggio | **TypeScript strict** | Type safety ovunque |
| UI | **shadcn/ui + Tailwind CSS v4 + Radix UI** | Controllo totale, look moderno, codice nel repo. Config brand (colori, font, breakpoint) vive in `src/app/globals.css` via `@theme`, **non più** in `tailwind.config.ts` |
| Icone | **Lucide React** | Set completo, coerente con shadcn |
| Font | **Geist Sans** (UI) + **Geist Mono** (numeri monetari) | Moderno, leggibile, ottimo per tabelle |
| Tema | **Dark + Light** con toggle utente | `prefers-color-scheme` al primo accesso, poi salvato |
| Form | **React Hook Form + Zod** | Validation condivisa client/server |
| Tabelle | **TanStack Table** (DataTable shadcn) | Sort, filter, pagination, row selection |
| Toast | **Sonner** | Integrato con shadcn |
| Upload | **react-dropzone** | Logo admin, certificati, scansioni moduli |
| ORM | **Prisma** | Schema-first, type-safe, eccellente DX |
| DB | **Supabase Postgres** (Ireland eu-west-1) | Piano Free, GDPR-compliant |
| Auth | **Supabase Auth + Resend SMTP** | Sicurezza gestita + email affidabili |
| Storage | **Supabase Storage** | Logo, certificati medici, moduli scansionati, ricevute PDF |
| Email | **Resend** | Transazionali + notifiche |
| PDF | **@react-pdf/renderer** | Ricevute, moduli precompilati, export tesseramento |
| Date | **date-fns** + **date-fns-tz** (locale `it`) | Timezone Europe/Rome sempre esplicito |
| Hosting | **Vercel** (team IAD) | Deploy da GitHub main |
| Monitoring | **Vercel Analytics + Sentry** | Errori in produzione |

---

## 🎨 Design system

### Tema
- **Dark mode** e **Light mode** gestiti con CSS variables (pattern shadcn)
- All'avvio: rispetta `prefers-color-scheme` del sistema
- Toggle utente persistito (cookie server-side per SSR consistency)
- Colori accenti limitati: verdi per entrate/successo, rossi per uscite/errori, ambra per warning, viola per compensi, blu per info

### Tipografia
- **Geist Sans** per tutto il testo
- **Geist Mono** specificamente per:
  - Importi monetari in tabelle (allineamento verticale perfetto)
  - Numeri di ricevuta (es. `IAD/2025-26/001`)
  - Codici fiscali, CAP, IBAN

### Componenti chiave (shadcn)
- `Button`, `Input`, `Label`, `Textarea`, `Select`, `Checkbox`, `Switch`, `RadioGroup`
- `Form` (con React Hook Form + Zod)
- `Table` / `DataTable` (con TanStack Table)
- `Dialog`, `Sheet`, `AlertDialog`, `Popover`
- `Calendar`, `DatePicker` (locale italiano)
- `Tabs`, `Card`, `Badge`
- `Command` (ricerca globale CMD+K)
- `DropdownMenu`, `NavigationMenu`
- `Avatar`, `Skeleton`
- `Toaster` (Sonner)

### Responsive strategy ⭐

**Mobile-first obbligatorio per le aree /parent e /teacher.**

Il target principale di queste due aree è lo **smartphone** (iPhone Safari + Android Chrome): i genitori controllano pagamenti/presenze dal telefono mentre sono in giro; l'insegnante segna presenze in sala di ballo con tablet o telefono, spesso con una sola mano libera. Un layout pensato desktop-first e "adattato" a mobile è sempre più scomodo rispetto a uno pensato mobile-first.

**L'area /admin resta desktop-first** (tabelle contabili, form lunghi, multi-colonna): Giuseppina lavora dal MacBook. Ma anche /admin deve restare **usabile da mobile** per controlli veloci (chi ha pagato oggi, chi è in lezione adesso).

**Breakpoint strategy** (Tailwind v4 standard):
| Breakpoint | Larghezza | Target | Note |
|---|---|---|---|
| (base) | < 640px | Mobile (iPhone SE → iPhone 15) | Minimum supported: 375px |
| `sm` | ≥ 640px | Mobile orizzontale | Raramente usato come breakpoint chiave |
| `md` | ≥ 768px | Tablet (iPad mini) | Pivot da card stack a tabella |
| `lg` | ≥ 1024px | Laptop | Abilita sidebar admin |
| `xl` | ≥ 1280px | Desktop | Layout multi-colonna completo |

**Regole concrete**:
- **Touch target minimo 44×44px** ovunque (Apple HIG + Material Design standard per mobile a11y)
- **Navigazione area /parent e /teacher**: tab-bar inferiore fissa (4-5 voci max) invece di sidebar, stile app nativa
- **Navigazione area /admin**: sidebar su `lg+`, collapsed drawer (Sheet) su `<lg`
- **DataTable → Card list**: tutte le tabelle shadcn/TanStack Table devono avere una variante card/list su `<md`, dove ogni riga diventa una card verticale con azioni primarie visibili e secondarie in dropdown
- **Dialog → Sheet bottom**: su `<md` i Dialog modali diventano Sheet bottom-drawer (pattern mobile nativo)
- **Form lunghi (≥10 campi)**: multi-step wizard con progress bar, mai scroll infinito. Un campo per step su `<md` se critico (es. dati anagrafici atleta)
- **Tastiera ottimizzata** via attributo `inputMode`:
  - `inputMode="numeric"` per CF, CAP, telefono, importi, codici
  - `inputMode="email"` per email
  - `inputMode="decimal"` per quantità con virgola
  - `inputMode="tel"` per telefoni (apre tastierino)
- **Date picker nativo** su `<md`: `<input type="date">` (iOS/Android picker sistema) invece di calendario shadcn custom, che su mobile piccolo è scomodo
- **Dark mode default in /teacher**: rileva automatico dark mode OS, preferibile in sala di ballo con luci basse (meno affaticamento)
- **Pull-to-refresh** su /parent dashboard e /teacher calendario (nice-to-have)

**Testing obbligatorio prima di chiudere una PR**:
- Viewport `375×667` (iPhone SE — minimo supportato)
- Viewport `390×844` (iPhone 15 — mainstream)
- Viewport `768×1024` (iPad — tablet insegnante)
- Viewport `1440×900` (MacBook — desktop Giuseppina)
- Test **reale** su almeno un iPhone + un Android tramite Vercel Preview QR code prima di mergeare su main

### Badge per causali contabili (da mockup Finanze)
- Quote mensili → neutro
- Quote saggio → giallo/ambra
- Compenso Giuseppina → viola
- Affitto → blu
- F24 → arancio
- Stage → verde
- Costumi → rosa

---

## 📁 Struttura cartelle

```
iad-portale/
├── CLAUDE.md                 ← questo file
├── README.md
├── .env.local                ← secrets (non committato)
├── .env.example              ← template pubblico
├── package.json
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts        ← non usato in Tailwind v4: config brand in `src/app/globals.css` via @theme
├── components.json           ← config shadcn
├── docs/
│   ├── PRD.md                ← requirements documento vivo
│   ├── architecture.md       ← decisioni architetturali (ADR)
│   ├── runbook.md            ← procedure operative
│   └── legal/                ← PDF moduli cartacei IAD ufficiali
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── public/
│   └── placeholder-logo.svg  ← fallback se admin non ha ancora caricato logo
└── src/
    ├── app/
    │   ├── (public)/         ← landing, login, iscrizione online, reset password
    │   ├── (admin)/          ← dashboard Giuseppina
    │   │   ├── dashboard/
    │   │   ├── alunne/
    │   │   ├── genitori/
    │   │   ├── corsi/
    │   │   ├── calendario/
    │   │   ├── stage/
    │   │   ├── saggio/
    │   │   ├── finanze/      ← entrate/uscite/compensi/scadenze/report
    │   │   ├── ricevute/
    │   │   ├── tesseramenti/ ← export Endas/CSEN
    │   │   ├── consensi/
    │   │   ├── comunicazioni/
    │   │   └── impostazioni/ ← brand settings (logo), solleciti config, anni
    │   ├── (teacher)/        ← area insegnante minimale
    │   │   ├── calendario/
    │   │   └── presenze/
    │   ├── (parent)/         ← area genitore
    │   │   ├── dashboard/
    │   │   ├── figli/
    │   │   ├── pagamenti/
    │   │   ├── stage/
    │   │   ├── saggio/
    │   │   ├── documenti/
    │   │   └── impostazioni/ ← solleciti on/off, dati anagrafici
    │   ├── api/              ← webhook, cron
    │   └── layout.tsx
    ├── components/
    │   ├── ui/               ← shadcn (auto-generated, qui vivono i componenti)
    │   ├── forms/
    │   ├── features/         ← componenti di dominio
    │   └── pdf/              ← template @react-pdf/renderer
    ├── lib/
    │   ├── supabase/         ← client server + browser
    │   ├── prisma.ts
    │   ├── resend.ts
    │   ├── sumup.ts          ← stub per futuro
    │   ├── validators/       ← schemi Zod
    │   ├── formatters/       ← date, money, CF
    │   └── utils/
    ├── server/
    │   ├── actions/          ← Server Actions
    │   └── services/         ← business logic
    │       ├── payments.ts
    │       ├── receipts.ts
    │       ├── reminders.ts
    │       ├── tesseramenti.ts
    │       └── cashflow.ts
    └── types/
```

---

## ✅ Convenzioni di codice

### Naming
- **File componenti**: `PascalCase.tsx` (es. `AthleteForm.tsx`)
- **File utility**: `kebab-case.ts` (es. `format-date.ts`)
- **File route App Router**: `page.tsx`, `layout.tsx`, `route.ts` (convenzione Next.js)
- **Nomi DB (Prisma)**: `PascalCase` per modelli, `camelCase` per campi, `snake_case` per mapping su DB con `@map`
- **Nomi tabelle DB**: `snake_case` plurali inglesi (`athletes`, `payments`, `academic_years`)

### Lingua nel codice
- **Codice + commenti + identificatori**: sempre in **inglese** (`Athlete`, non `Atleta`)
- **Stringhe visibili all'utente**: sempre in **italiano** (UI, email, PDF)
- Useremo `next-intl` da subito per preparare i18n (anche se solo `it-IT` per ora)

### TypeScript
- **`strict: true`** sempre
- Mai `any`. Usare `unknown` + narrowing.
- Tipi espliciti su funzioni esportate
- Prisma genera i tipi, **usiamo quelli** (niente duplicazione)

### React / Next.js
- **Server Components by default**. Usa `"use client"` solo dove serve (stato, eventi, hooks browser)
- **Server Actions** per mutations (`"use server"`)
- **Route Handlers** (`route.ts`) solo per webhook/cron/download file
- **Route protection**: in Next.js 16 il file è `src/proxy.ts` (sostituisce il vecchio `src/middleware.ts`). Lì vivono auth gates, rewrite, redirect e role-based routing
- Niente `useEffect` per fetch: data fetching sempre server-side

### Database & Prisma
- **Migrations versionate**: ogni modifica → `prisma migrate dev --name descrittivo`
- **Mai `prisma db push` in produzione**. Solo `migrate deploy`.
- **Soft delete** su entità sensibili (`deletedAt: DateTime?`) invece di DELETE
- **Audit fields** su tutto: `createdAt`, `updatedAt`
- **Importi** sempre in **centesimi (Int)** — mai Float/Decimal per evitare floating point

### Date & timezone
- **Timezone operativo**: `Europe/Rome`
- Date in DB: sempre UTC (`DateTime` Prisma)
- Date in UI: convertite con `date-fns-tz` → `formatInTimeZone(date, 'Europe/Rome', 'dd/MM/yyyy')`
- Formato display italiano: `dd/MM/yyyy` (date), `HH:mm` (ore)

### Errori
- Mai `alert()` o `console.log()` per l'utente
- Toast Sonner per feedback (`toast.success()`, `toast.error()`)
- Errori server → Sentry + log strutturato
- Errori validation → mostrati inline nel form (Zod + React Hook Form)

---

## 🔐 Sicurezza e privacy (CRITICO: dati di minori!)

### Principi non negoziabili
1. **Dati minori**: trattati con cura estrema. Niente analytics invasivi. Niente export non necessari.
2. **RLS (Row Level Security) su Supabase**: un genitore **NON DEVE MAI** vedere dati di altri genitori. Un'insegnante **NON DEVE MAI** vedere dati di corsi non suoi. Policy RLS su **ogni** tabella che contiene dati personali.
3. **Secrets mai nel codice**: tutte le API keys in `.env.local` (dev) e Vercel env vars (prod). Mai committare.
4. **Audit log**: azioni critiche (cancellazioni, modifiche pagamenti, export dati, invio email massive) sono loggate in `AuditLog`.
5. **Export GDPR**: ogni genitore deve poter esportare i propri dati e richiedere cancellazione.
6. **Minimizzazione**: raccogliamo solo ciò che serve. Niente campi "nice to have".
7. **Backup**: admin deve poter esportare **tutto** (CSV/XLSX/JSON) per non essere ostaggio del sistema.

### Cosa NON fare mai
- ❌ `localStorage` per dati sensibili (usare solo per preferenze UI tipo tema)
- ❌ Loggare codici fiscali, indirizzi, telefoni
- ❌ Mandare email con dati sensibili in chiaro (solo link a pagine protette)
- ❌ Generare URL che contengano CF o ID atleta esposti (usare UUID opachi)
- ❌ Upload file senza validazione MIME + size check
- ❌ Query senza RLS check
- ❌ Mostrare a un'insegnante dati contatto/finanza

### Cosa fare SEMPRE
- ✅ RLS policy testata prima del deploy
- ✅ Rate limiting sui form pubblici (iscrizione, login)
- ✅ Validazione Zod su ogni input, client E server
- ✅ Sanitizzazione HTML se renderizzi contenuto utente
- ✅ CSP header via `next.config.ts`
- ✅ 2FA disponibile (anche se opzionale) per admin

---

## 📬 Flussi email (via Resend)

Giuseppina comunica oggi via email. Questi sono i flussi automatici che il sistema gestirà:

### Email transazionali
1. **Benvenuto genitore**: dopo creazione account → link set password
2. **Pagamento ricevuto**: subito dopo registrazione pagamento + PDF ricevuta allegata
3. **Scadenza certificato medico**: 30/15/3 giorni prima
4. **Sospensione accesso**: in caso di morosità >N giorni
5. **Conferma iscrizione stage**: dopo iscrizione genitore
6. **Password reset**: standard Supabase

### Solleciti quote non pagate ⭐ NUOVO
Sistema a 3 livelli di granularità:
- **Config globale** (`ReminderConfig`): Giuseppina imposta giorni scadenza (es. "primo sollecito 3 giorni dopo scadenza, secondo sollecito 10 giorni dopo")
- **Override per genitore** (`Parent.remindersEnabled`): un genitore può avere i solleciti automatici disattivati (es. casi gestiti a voce, famiglie con accordi speciali)
- **Tasto manuale** nel profilo genitore/alunna: Giuseppina clicca "Invia sollecito ora" → email generata al volo (bypassando la logica automatica, es. per anticipare)

### Broadcast (manuali)
- **Comunicazioni generali**: admin scrive a tutti, a un corso, a un gruppo custom (saggio, chiusure, eventi)

### Ogni email
- Lingua italiana, tono caldo ma professionale
- Logo IAD in header (dal `BrandSettings` caricato da admin)
- Dati ASD in footer (ragione sociale, CF, indirizzo)
- Link unsubscribe per le non-transazionali
- Log in `EmailLog` (successo/fallimento, per debugging)

### WhatsApp (MVP = link manuale)
Per ora NON integriamo WhatsApp Business API. Però ogni pagina rilevante ha un bottone "Invia via WhatsApp" che apre `wa.me/NUMERO?text=MESSAGGIO_PRECOMPILATO`. Giuseppina clicca → si apre WhatsApp Web → manda.

---

## 💶 Finanze e contabilità

### Entrate (`Payment`)
Tipologie (enum `FeeType`):
- `ASSOCIATION` - Quota associativa annuale
- `MONTHLY` - Quota mensile
- `TRIMESTER` - Quota trimestrale
- `STAGE` - Iscrizione stage
- `SHOWCASE_1` - Saggio 1ª rata
- `SHOWCASE_2` - Saggio 2ª rata
- `COSTUME` - Costumi/accessori
- `TRIAL_LESSON` - Lezione di prova
- `OTHER`

Metodi (enum `PaymentMethod`): `CASH`, `TRANSFER`, `POS`, `SUMUP_LINK` (V2), `OTHER`

### Uscite (`Expense`)
Tipologie (enum `ExpenseType`):
- `RENT` - Affitto palestra
- `TAX_F24` - F24 (IVA, INPS, ecc.)
- `UTILITY` - Utenze
- `COMPENSATION` - Compenso sportivo Giuseppina/insegnanti
- `COSTUME_PURCHASE` - Acquisto costumi per saggio
- `MATERIAL` - Materiale tecnico
- `INSURANCE` - Premio assicurativo
- `AFFILIATION` - Affiliazione Endas/CSEN
- `OTHER`

### Cashflow unificato (`CashflowEntry`)
Vista read-only che unisce entrate e uscite, con filtri per:
- Anno fiscale (gennaio-dicembre)
- Anno accademico (settembre-giugno)
- Mese
- Tipologia / causale
- Metodo di pagamento
- Ricerca testuale

### Compenso Giuseppina ⭐ FEATURE SPECIFICA
Monitoraggio automatico con:
- Soglia annuale **€15.000** (regime sportivo dilettantistico)
- Progress bar visibile in dashboard
- Alert al raggiungimento di 80%, 90%, 100%
- Storico compensi con data, importo, causale
- Report annuale esportabile per commercialista

### Ricevute — numerazione differenziata
Formato: `IAD/[anno-accademico]/[progressivo][suffisso]`

Suffissi:
- `n.196` → quote regolari (nessun suffisso, solo numero)
- `n.45/S` → quota saggio
- `n.4/C` → costume
- `n.4` → prestazione occasionale (compenso)

Ogni ricevuta:
- PDF generato con `@react-pdf/renderer`
- Logo IAD (da `BrandSettings`) in header
- Dati ASD completi
- Dati pagante (genitore o atleta maggiorenne)
- Dati beneficiario
- Descrizione causale + periodo coperto
- Importo, metodo pagamento, data
- **Dicitura detraibilità** per minori 5-18 anni (art. 15 TUIR)
- Salvata in Supabase Storage

### Ricevuta in bianco (template)
Sezione admin: "Genera ricevuta al volo" → form con campi minimi (pagante, importo, causale, data) → genera PDF con intestazione ASD precompilata. Serve per casi fuori sistema (es. pagamento occasionale non legato a un'atleta).

### Export contabile
- CSV/XLSX movimenti per anno fiscale (per commercialista)
- CSV/XLSX movimenti per anno accademico
- Report compensi Giuseppina
- Backup completo (tutte le tabelle) in ZIP annuale

---

## 🎭 Stage e Saggio

### Stage (evento occasionale)
- Admin crea stage con: titolo, data, orario, location, capienza, quota
- Visibile nell'area genitore
- Genitore si iscrive per i propri figli
- Pagamento manuale (contanti/bonifico/POS) registrato da admin, o (V2) SumUp link
- Export partecipanti PDF

### Saggio (evento annuale)
- Un saggio per `AcademicYear`
- Quota partecipazione in 2 rate (entro gennaio + entro aprile)
- Ogni atleta che partecipa ha:
  - Una o più **coreografie** (collegate ai corsi)
  - Uno o più **costumi** con costo separato
  - Eventuali accessori (scarpette specifiche, trucchi, ecc.)
- Gestione assegnazione costumi per gruppo
- Report partecipanti + pagamenti + costumi
- Stampabile elenco per backstage

---

## 📄 PDF generati dal sistema

- **Ricevuta sportiva** (sostituisce quelle scritte a mano!)
- **Ricevuta in bianco** (template precompilato)
- **Modulo iscrizione precompilato** (da stampare, firmare)
- **Modulo lezione di prova precompilato**
- **Certificazione detraibilità spese sportive minori** (per 730)
- **Registro presenze mensile** (per archivio ASD)
- **Export iscritti Endas** per tesseramento
- **Export iscritti CSEN** per tesseramento
- **Export iscritti generale**
- **Report finanziario annuale** (per commercialista)

Tutti generati con `@react-pdf/renderer`, formato A4, layout coerente con brand IAD (logo + colori da `BrandSettings`).

---

## 🎨 Brand Settings (logo caricabile)

Sezione `Impostazioni > Brand` in area admin. Giuseppina può:
- **Caricare il logo IAD** (upload in Supabase Storage, file `brand/logo-{version}.svg|png`)
- Sostituirlo in qualsiasi momento (versioning automatico)
- Caricare una favicon (generata da logo o separata)
- Definire colore primario (accent brand) — usato in UI + PDF
- Configurare dati ASD mostrati in ricevute/email (nome, indirizzo, CF, IBAN bonifici, telefono, email, sito web)

Il frontend **legge sempre da DB**, non da file statici. Fallback a `public/placeholder-logo.svg` se mai nulla è caricato.

---

## 🚦 Fasi di sviluppo (vedi `docs/PRD.md` per dettaglio)

| Sprint | Cosa | Priorità |
|---|---|---|
| **0** | Setup, Prisma schema, seed, auth base, Brand Settings, tema dark/light | 🔴 |
| **1** | Anagrafiche: atlete, genitori, insegnanti, corsi | 🔴 |
| **2** | Calendario + presenze (admin + teacher) | 🔴 |
| **3** | Pagamenti + ricevute PDF + numerazione | 🔴 |
| **4** | Sezione Finanze (uscite + cashflow + compensi) | 🔴 |
| **5** | Area genitore (read-only core + iscrizione corsi) | 🟡 |
| **6** | Email automatiche + solleciti configurabili | 🟡 |
| **7** | Iscrizione online + consensi versioning | 🟡 |
| **8** | Stage (admin + iscrizione genitori) | 🟡 |
| **9** | Saggio + costumi | 🟢 |
| **10** | Tesseramenti Endas/CSEN (export PDF) | 🟢 |
| **11** | Reportistica + dashboard KPI + export completi | 🟢 |
| **12** (V2) | SumUp Payment Links (se confermato) | — |

🔴 = MVP (senza questo non si parte)
🟡 = V1 (utilizzabile da Giuseppina e genitori)
🟢 = V2 (tutto il resto)

---

## 🧪 Testing

- **Unit**: Vitest per funzioni pure (validators, formatters, business logic, calcolo quote, numerazione ricevute)
- **Integration**: Playwright per flussi critici (iscrizione, pagamento, login, generazione ricevuta)
- **RLS**: test specifici che verifichino che un genitore NON vede dati altrui, un'insegnante non vede dati finanziari
- **Coverage target**: 60% nel MVP, 80% in V1

Mai pushare su `main` senza test verde. CI via GitHub Actions.

---

## 📝 Convenzioni Git

- Branch `main` protetto, deploy automatico su Vercel produzione
- Feature branch: `feat/nome-breve`, `fix/bug-breve`, `chore/...`, `docs/...`
- Commit convenzionali: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- PR con descrizione, checklist, screenshot UI
- Merge via **squash and merge** (history pulita)

---

## 🚨 Cose che Claude Code deve ricordare sempre

1. **Questo progetto gestisce dati di minori**: ogni decisione passa dal filtro "è sicuro? è necessario?"
2. **Giuseppina non è tecnica**: UI super chiara, messaggi in italiano senza gergo, conferme su azioni distruttive
3. **Italia, non USA**: date `dd/MM/yyyy`, euro `€`, virgola decimale, CAP italiano, province, codice fiscale
4. **ASD, non azienda**: "soci" non "clienti", "quote" non "abbonamenti", "ricevute" non "fatture" (no fattura elettronica nel MVP)
5. **Certificato medico scaduto = blocco assoluto**: l'atleta non può fare presenza. Punto.
6. **Quote non rimborsabili**: in nessun caso il sistema propone refund automatici
7. **Stop iperottimizzazione prematura**: non servono Redis, Kafka, microservizi. Next.js + Postgres + Vercel basta.
8. **Importi in centesimi (Int)**: mai floating point per soldi
9. **Dominio produzione**: `area.irpiniaartedanza.it` (non "portale", non "app")
10. **Interpretazione A** per iscrizioni: cartaceo + online convivono, stesso DB
11. **Doppia chiave temporale**: ogni entità finanziaria referenzia sia `academicYearId` che `fiscalYearId`
12. **Logo MAI inline**: sempre da `BrandSettings` (DB/Storage). Fallback a placeholder solo se non caricato
13. **Compenso Giuseppina** è una feature prima classe: soglia €15.000 monitorata, progress bar sempre visibile
14. **Endas/CSEN** non hanno API: solo export PDF per referenti
15. **Solleciti = 3 livelli di controllo**: config globale + override per-genitore + tasto manuale
16. **Mobile-first per /parent e /teacher**: queste aree sono pensate primariamente per smartphone. Tutti i componenti devono partire da mobile (375px base) e espandersi verso desktop. Area /admin è desktop-first. Touch target ≥44×44px ovunque. Testare sempre su viewport 375×667 prima di chiudere un task.

---

## 📚 Documenti di riferimento

- `docs/PRD.md` — Requisiti funzionali completi
- `docs/architecture.md` — Decisioni architetturali (ADR)
- `docs/runbook.md` — Procedure operative
- `docs/legal/` — Moduli cartacei IAD ufficiali:
  - Modulo iscrizione maggiorenni 2025/26
  - Modulo iscrizione minorenni 2025/26
  - Modulo lezione di prova minorenni
  - Regolamento scuola 2025/26
  - Richiesta comodato palestra

---

_Ultimo aggiornamento: 2026-04-20 · Versione 2.2 — Aggiunta policy mobile-first per /parent e /teacher_
