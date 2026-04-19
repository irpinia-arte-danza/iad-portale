# Architecture Decision Records (ADR) — IAD Portale

> Questo documento traccia le **decisioni architetturali** prese nel progetto, con il contesto e le motivazioni.

---

## ADR-001: Dominio di produzione `area.irpiniaartedanza.it`

**Data**: 2026-04-19
**Status**: ✅ Accettata

### Decisione
`area.irpiniaartedanza.it` come sottodominio dedicato.

### Motivazione
- "area" = parola universalmente compresa dai genitori italiani
- Separa sito vetrina (futuro) dal gestionale
- Caldo e non-tech

---

## ADR-002: Stack Next.js 15 + Supabase + Prisma + **shadcn/ui**

**Data**: 2026-04-19
**Status**: ✅ Accettata (aggiornato da HeroUI a shadcn/ui)

### Decisione
- **Next.js 15** App Router + Server Components + React 19
- **Supabase** (Postgres + Auth + Storage) Ireland eu-west-1
- **Prisma** come ORM
- **shadcn/ui + Tailwind + Radix** come UI library
- **Lucide React** per icone
- **Geist Sans + Geist Mono** come font
- **Vercel** hosting
- **Resend** provider email

### Motivazione shadcn/ui (vs HeroUI iniziale)
- Controllo totale: codice nel repo, nessun black-box
- Stile "dashboard-grade" perfetto per gestionali
- TanStack Table integrato per DataTable potenti
- Più flessibilità per custom component
- Standard de facto per admin panel nel 2026

### Font Geist
- Moderno, leggibile, pensato per UI digitali (di Vercel)
- Geist Mono specifico per numeri monetari in tabelle

---

## ADR-003: Database — sviluppo diretto contro Supabase cloud

**Data**: 2026-04-19
**Status**: ✅ Accettata (rivedibile)

### Decisione
Un solo progetto Supabase `iad-portale`, condiviso tra dev e produzione. No branching, no Docker locale.

### Motivazione
- 1 solo sviluppatore → nessun conflitto
- Zero setup locale
- Traffico bassissimo in sviluppo

---

## ADR-004: Auth tramite Supabase Auth + Resend SMTP custom

**Data**: 2026-04-19
**Status**: ✅ Accettata

### Decisione
Supabase Auth con Resend come SMTP custom (bypass limite 2 email/ora nativo).

---

## ADR-005: Iscrizioni — cartaceo e online convivono

**Data**: 2026-04-19
**Status**: ✅ Accettata

Doppio canale, stesso DB. Non forziamo comportamenti.

---

## ADR-006: Importi monetari in centesimi (Int), non Decimal

**Data**: 2026-04-19
**Status**: ✅ Accettata

Niente floating point. Mai.

---

## ADR-007: Soft delete su entità sensibili

**Data**: 2026-04-19
**Status**: ✅ Accettata

`deletedAt` su User, Athlete, Parent, Teacher, Expense, Document. Mai su Payment (solo REVERSED con audit).

---

## ADR-008: Repo strategy — 1 repo singolo per il gestionale

**Data**: 2026-04-19
**Status**: ✅ Accettata

`irpinia-arte-danza/iad-portale`. Niente monorepo. Sito vetrina sarà repo separato.

---

## ADR-009: Logo caricabile dall'admin, mai inline ⭐ NUOVO

**Data**: 2026-04-19
**Status**: ✅ Accettata

### Contesto
Il logo IAD non è stabile: potrebbe essere aggiornato, avere varianti dark/light, cambiare nel tempo. Non ha senso committarlo come asset statico.

### Decisione
Tabella `BrandSettings` (singleton) con:
- `logoUrl` (principale)
- `logoDarkUrl` (variante dark mode, opzionale)
- `faviconUrl`
- Colori primario/secondario
- Dati ASD (nome, indirizzo, CF, IBAN, ecc.)

File caricati in Supabase Storage bucket `brand/`.

Il frontend e i PDF leggono **sempre** dal DB. Fallback a `public/placeholder-logo.svg` se mai caricato.

### Motivazione
- Admin autonomo (nessun deploy per cambiare logo)
- Versioning automatico (ogni upload è un file nuovo)
- Separazione clean tra "brand" e "codice"

---

## ADR-010: Tema dark + light con toggle utente ⭐ NUOVO

**Data**: 2026-04-19
**Status**: ✅ Accettata

### Decisione
- Entrambi i temi disponibili
- All'avvio: rispetta `prefers-color-scheme` OS
- Toggle utente persiste in `User.themePreference`
- Cookie server-side per SSR consistency (evitare flash)
- CSS variables via shadcn pattern

### Motivazione
- Standard moderno, atteso dagli utenti
- Giuseppina lavora spesso di sera → dark comodo
- Genitori su mobile con OS theme → consistency

---

## ADR-011: Doppia chiave temporale (AcademicYear + FiscalYear) ⭐ NUOVO

**Data**: 2026-04-19
**Status**: ✅ Accettata

### Contesto
Le ASD hanno due cicli temporali paralleli:
- **Anno accademico**: settembre → giugno/agosto (iscrizioni, corsi, saggio)
- **Anno fiscale**: 1 gennaio → 31 dicembre (contabilità, bilancio)

Molti gestionali sbagliano modellando solo uno dei due.

### Decisione
Due tabelle separate: `AcademicYear` e `FiscalYear`.

Ogni entità finanziaria (`Payment`, `Expense`, `TeacherCompensation`) referenzia **entrambe** le chiavi.

Le viste applicative filtrano per l'una o l'altra in base al contesto:
- Dashboard iscrizioni → anno accademico
- Cashflow/Report commercialista → anno fiscale

### Motivazione
- Consente report corretti per entrambi i cicli
- Evita scempi tipo "contabilità fiscale a cavallo dell'estate"

---

## ADR-012: Ricevute con numerazione categorizzata ⭐ NUOVO

**Data**: 2026-04-19
**Status**: ✅ Accettata

### Decisione
Enum `ReceiptCategory` con numerazione separata per categoria:

| Categoria | Esempio |
|---|---|
| REGULAR | `IAD/2025-26/196` |
| SHOWCASE | `IAD/2025-26/45/S` |
| COSTUME | `IAD/2025-26/4/C` |
| COMPENSATION | `IAD/2025-26/4` |
| BLANK | `IAD/2025-26/B-1` |

### Motivazione
- Rispecchia prassi contabile già in uso da Giuseppina
- Permette report distinti per tipologia
- Separa contabilmente compensi (prestazione occasionale) da ricevute sportive

---

## ADR-013: Solleciti con 3 livelli di controllo ⭐ NUOVO

**Data**: 2026-04-19
**Status**: ✅ Accettata

### Contesto
Automazione solleciti = utilissima, ma rigidità totale = rottura. Famiglie particolari, accordi a voce, preferenze personali esistono.

### Decisione
Tre livelli:

1. **Config globale** (tabella `ReminderConfig` singleton):
   - Abilitato/disabilitato
   - Giorni dopo scadenza per 1° e 2° sollecito
   - Giorni per sospensione

2. **Override per genitore** (`Parent.remindersEnabled`):
   - Se `false`, nessun sollecito automatico a quel genitore
   - Genitore può gestirlo da sé dalle proprie impostazioni

3. **Tasto manuale** "Invia sollecito ora":
   - Nel profilo genitore/alunna
   - Bypassa tutta la logica automatica
   - Tipo email `PAYMENT_REMINDER_MANUAL`
   - Log con `triggeredBy` = user id

### Motivazione
- Giuseppina mantiene controllo sulle singole situazioni
- Automatismo non è "sparo e spero"
- Sistema flessibile come la vita reale

---

## ADR-014: Ruolo Insegnante attivo dall'MVP ⭐ NUOVO

**Data**: 2026-04-19
**Status**: ✅ Accettata

### Contesto
Inizialmente previsto come "predisposto ma inattivo". Poi chiarito che c'è un'aiutante che potrebbe usare il sistema.

### Decisione
Ruolo `TEACHER` attivo dall'MVP con interfaccia minimale:
- Login dedicato
- Vede solo calendario e presenze del proprio corso
- Niente accesso a pagamenti, contabilità, altri corsi
- RLS specifiche su ogni tabella rilevante

L'admin decide quando attivare gli account insegnanti.

### Motivazione
- Featurizzare dopo sarebbe più costoso
- Permette scalabilità naturale (1 insegnante oggi, N domani)
- RLS e UI vanno pensate da subito correttamente

---

## ADR-015: Endas/CSEN via PDF (no API) ⭐ NUOVO

**Data**: 2026-04-19
**Status**: ✅ Accettata

### Contesto
Verificato: Endas e CSEN non hanno API pubbliche. Il tesseramento si fa tramite portale web + l'admin IAD manda al referente la lista.

### Decisione
- Tabella `Affiliation` per tracciare affiliazioni per atleta + ente + anno
- Stati: PENDING → SENT → CONFIRMED → EXPIRED
- **Export PDF** tabellare dedicato per referente Endas
- **Export PDF** tabellare dedicato per referente CSEN
- Numero tessera salvato quando ricevuto dal referente

### Motivazione
Pragmatismo: niente integrazioni fantasma, ma sistema strutturato.

---

## ADR-016: Entrate e Uscite separate + Cashflow unificato ⭐ NUOVO

**Data**: 2026-04-19
**Status**: ✅ Accettata

### Decisione
- `Payment` = entrate (quote, stage, saggio, costumi)
- `Expense` = uscite (affitto, F24, compensi, utenze, ecc.)
- Vista `CashflowEntry` (query/view applicativa, non tabella) unisce le due
- `TeacherCompensation` = entità dedicata per compensi sportivi, con link a `Expense`

### Motivazione
- Separazione semantica chiara
- Riutilizzo di enum specifici per categoria
- Join logici per il cashflow unificato senza duplicazione

---

## ADR-017: SumUp Payment Links in V2 (non MVP)

**Data**: 2026-04-19
**Status**: ✅ Accettata

### Decisione
Nell'MVP i pagamenti sono **offline-only** (admin registra contanti/bonifico/POS). SumUp API da verificare e integrare in V2.

### Motivazione
- Integrazione SumUp richiede verifica contratto + credenziali developer
- Non è bloccante per il rilascio del gestionale
- Feature aggiungibile in un'integrazione separata senza impatto su resto del codice

---

_Ultimo aggiornamento: 2026-04-19_
