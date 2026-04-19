# IAD Portale

> Gestionale web per A.S.D. IAD Irpinia Arte Danza (Montella, AV)
> **Dominio produzione**: https://area.irpiniaartedanza.it

---

## 🎯 Cosa è

Sistema di gestione per una scuola di danza ASD:
- **Admin** (Giuseppina): gestione completa anagrafiche, presenze, pagamenti, finanze, ricevute, tesseramenti
- **Insegnanti**: interfaccia minimale per segnare presenze del proprio corso
- **Genitori**: area riservata con iscrizioni stage/saggio, consultazione pagamenti/presenze/scadenze

Sostituisce il workflow cartaceo + gestione contabilità su Drive.

---

## 🏗️ Stack

- **Next.js 15** (App Router, Server Components, React 19)
- **TypeScript** strict
- **shadcn/ui + Tailwind CSS + Radix UI**
- **Lucide React** (icone)
- **Geist Sans + Geist Mono** (font)
- **Dark + Light** mode (toggle utente)
- **Prisma** ORM + **Supabase Postgres** (Ireland, eu-west-1)
- **Supabase Auth** + **Resend** SMTP custom
- **React Hook Form** + **Zod** (validation)
- **TanStack Table** (DataTable)
- **Sonner** (toast)
- **react-dropzone** (upload file)
- **@react-pdf/renderer** (ricevute, moduli)
- **date-fns** + **date-fns-tz** (timezone Europe/Rome)

Hosting su **Vercel**, versioning su **GitHub**, secrets in **1Password**.

---

## 📁 Struttura

```
iad-portale/
├── CLAUDE.md              ← contesto per Claude Code (leggi SEMPRE prima)
├── README.md              ← questo file
├── components.json        ← config shadcn
├── docs/
│   ├── PRD.md             ← requisiti funzionali completi
│   ├── architecture.md    ← ADR (decisioni architetturali)
│   ├── runbook.md         ← procedure operative
│   └── legal/             ← PDF moduli cartacei IAD ufficiali
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── public/
│   └── placeholder-logo.svg  ← fallback se admin non carica logo
└── src/
    ├── app/
    │   ├── (public)/      ← landing, login, iscrizione online
    │   ├── (admin)/       ← dashboard Giuseppina
    │   ├── (teacher)/     ← area insegnante (presenze, calendario)
    │   ├── (parent)/      ← area genitori
    │   └── api/
    ├── components/
    │   ├── ui/            ← shadcn (generati con CLI)
    │   ├── forms/
    │   ├── features/      ← componenti di dominio
    │   └── pdf/           ← template @react-pdf/renderer
    ├── lib/
    ├── server/
    └── types/
```

---

## 🚀 Setup locale (prima volta)

### 1. Clona e installa

```bash
git clone git@github.com:irpinia-arte-danza/iad-portale.git
cd iad-portale
npm install
```

### 2. Configura le variabili d'ambiente

```bash
cp .env.example .env.local
# Compila con i valori reali da 1Password:
# - SUPABASE_*, DATABASE_URL, DIRECT_URL
# - RESEND_API_KEY (quando sarà pronto)
```

### 3. Applica migrations e seed

```bash
npx prisma migrate dev          # applica schema al DB Supabase
npx prisma db seed              # popola dati di test
npx prisma studio               # ispeziona i dati (GUI)
```

### 4. Avvia dev server

```bash
npm run dev
# → http://localhost:3000
```

---

## 🎨 Theming con shadcn

Il progetto usa shadcn/ui con CSS variables per tema dark/light. Il tema è controllato da:
- `prefers-color-scheme` all'avvio (primo accesso)
- Toggle utente in header (persistito in DB + cookie)
- `next-themes` per gestione client-side

Colori primari da `BrandSettings` (caricabili da admin).

---

## 🔐 Setup Supabase (una tantum)

In Supabase Dashboard:

1. **Auth → Email Templates**: versioni italiane
2. **Auth → SMTP**: configura Resend custom SMTP
3. **Storage → Buckets**:
   - `brand` (privato, per logo)
   - `documents` (privato, moduli scansionati)
   - `certificates` (privato, medici)
   - `receipts` (privato, PDF ricevute)
   - `expenses` (privato, fatture uscite)
4. **Database → Policies (RLS)**: abilita su tutte le tabelle
5. **Database → Extensions**: `uuid-ossp`

Dettagli in `docs/runbook.md`.

---

## 🧪 Comandi utili

```bash
npm run dev               # avvia dev server
npm run build             # build produzione
npm run lint              # linting
npm run type-check        # check TypeScript
npm run test              # Vitest
npm run test:e2e          # Playwright

npx prisma migrate dev    # crea migration da modifica schema
npx prisma migrate deploy # applica migrations pendenti (prod)
npx prisma generate       # rigenera client Prisma
npx prisma studio         # GUI ispezione DB
npx prisma db seed        # esegui seed

npx shadcn@latest add [component]  # aggiungi componente shadcn
```

---

## 📦 Deploy

- **Branch `main`** → deploy automatico Vercel su https://area.irpiniaartedanza.it
- **Preview** → ogni PR ha preview URL
- **Rollback** → Vercel Dashboard → Deployments → Promote precedente

---

## 🔒 Sicurezza (dati di minori!)

1. **Mai committare** `.env*` (eccetto `.env.example`)
2. **Mai loggare** CF, indirizzi, telefoni
3. **RLS sempre attiva** su ogni tabella con PII
4. **2FA** consigliato per account admin
5. **Audit log** su azioni critiche
6. **Accessi condivisi** via 1Password vault IAD

---

## 👥 Contatti e accessi

- **Owner**: Giuseppina Ciociola — info@irpiniaartedanza.it
- **Developer**: Federico Passaro
- **1Password vault**: `IAD - Irpinia Arte Danza`

---

## 📚 Documentazione

Prima di modificare qualsiasi cosa:

1. **`CLAUDE.md`** — contesto + convenzioni + regole non negoziabili
2. **`docs/PRD.md`** — requisiti funzionali e roadmap sprint
3. **`docs/architecture.md`** — ADR (17 decisioni architetturali)

---

_Last updated: 2026-04-19 · v2.0_
