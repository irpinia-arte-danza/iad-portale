# 🚀 Prompt di kickoff per Claude Code — Sprint 0

> Questo è il **primo prompt** da dare a Claude Code quando apri il progetto.
> Claude Code leggerà CLAUDE.md automaticamente, ma questo prompt gli dice cosa fare.

---

## Come usarlo

1. Apri VS Code nella cartella `iad-portale/`
2. Attiva Claude Code (estensione o terminale `claude`)
3. Copia il prompt qui sotto nella chat con Claude Code
4. Lascia che lavori, rispondendo ai suoi check intermedi

---

## 📋 PROMPT DA COPIARE

```
Ciao Claude! Lavoriamo insieme sul progetto IAD Portale.

**Contesto**: Prima di iniziare, leggi attentamente questi file nel repository:
1. `CLAUDE.md` — contesto progetto, convenzioni, vincoli non negoziabili
2. `docs/PRD.md` — requisiti funzionali e roadmap 12 sprint
3. `docs/architecture.md` — 17 ADR (decisioni architetturali)
4. `prisma/schema.prisma` — schema database completo

**Stato attuale**: Il progetto è in fase di kickoff. Sono pronti:
- CLAUDE.md, PRD, architecture, schema Prisma
- Account Vercel, Supabase, GitHub, 1Password configurati
- `.env.example` come template; NON ho ancora creato `.env.local`

**Missione Sprint 0 — Fondamenta**: Inizializzare Next.js 15 + shadcn/ui e arrivare ad avere:
1. Login funzionante
2. Toggle tema dark/light
3. Brand Settings (admin carica logo)
4. Dashboard admin che mostra logo caricato + "Ciao Giuseppina"

**Stack finale confermato**:
- Next.js 15 App Router + TypeScript strict + Tailwind
- shadcn/ui + Radix + Lucide + Geist Sans/Mono
- Prisma + Supabase Postgres (Ireland)
- Supabase Auth + Resend SMTP (Resend configurato dopo)
- React Hook Form + Zod
- TanStack Table (per dopo, sprint anagrafiche)
- Sonner (toast)
- next-themes (toggle dark/light)
- react-dropzone (upload file)

**Ordine operativo** (chiedimi conferma prima di ogni fase):

**Fase 1 — Bootstrap**
- `npx create-next-app@latest . --typescript --tailwind --app --eslint --src-dir --import-alias "@/*"`
- Pulizia boilerplate
- `tsconfig.json` strict
- `.gitignore` aggiornato

**Fase 2 — shadcn/ui init**
- `npx shadcn@latest init` (scegli base color: neutral, CSS variables: yes)
- Installa componenti base che serviranno: button, input, label, card, form, toast (sonner), dialog, alert-dialog, dropdown-menu, avatar, badge, separator, tabs, sheet
- Integra Geist Sans e Geist Mono (font Next.js font-geist-sans + geist-mono)
- Setup next-themes per dark/light toggle

**Fase 3 — Dipendenze aggiuntive**
Installa:
- `@prisma/client prisma` (dev)
- `@supabase/supabase-js @supabase/ssr`
- `react-hook-form @hookform/resolvers zod`
- `date-fns date-fns-tz`
- `resend`
- `@react-pdf/renderer`
- `lucide-react`
- `@tanstack/react-table`
- `react-dropzone`
- `next-themes`
- `sonner`
Dev:
- `vitest @vitejs/plugin-react @testing-library/react`
- `@playwright/test`
- `prettier prettier-plugin-tailwindcss`

**Fase 4 — Configurazioni**
- `tailwind.config.ts` con shadcn config + Geist fonts + locale italiano
- `next.config.ts` con security headers (CSP, X-Frame-Options, Referrer-Policy)
- `src/lib/prisma.ts` (singleton client)
- `src/lib/supabase/server.ts` e `src/lib/supabase/client.ts` (pattern SSR)
- `src/lib/resend.ts` (stub)
- `src/middleware.ts` per route protection:
  - `/admin/*` → solo admin
  - `/teacher/*` → solo teacher
  - `/parent/*` → solo parent
  - `/login`, `/iscrizione` → pubblici

**Fase 5 — Prisma + DB**
- Copia `prisma/schema.prisma` dal repo (è già pronto, NON ricrearlo)
- Configura `prisma/seed.ts`:
  - 1 admin (Giuseppina) con utente Supabase Auth
  - 1 `AcademicYear` 2025-2026
  - 1 `FiscalYear` 2026
  - 5 corsi base (Gioco Danza, Propedeutica, Classica, Moderna, Contemporanea)
  - 1 `BrandSettings` singleton con dati ASD base (no logo, useremo placeholder)
  - 1 `ReminderConfig` singleton con default (3/10/20 giorni)
- `npx prisma migrate dev --name init`
- `npx prisma db seed`
- Verifica con `npx prisma studio`

**Fase 6 — Auth flow**
- Route `app/(public)/login/page.tsx` con form email+password (shadcn Form + RHF + Zod)
- Server Action per login Supabase
- Callback route auth (anche se non usiamo OAuth, lasciala pronta)
- Middleware che reindirizza in base al ruolo dopo login
- Logout action funzionante
- Recovery password base

**Fase 7 — Tema dark/light**
- Integra `next-themes` nel root layout
- Toggle tema in header (Sun/Moon icon lucide)
- Persistenza preferenza utente: server action che aggiorna `User.themePreference`
- Cookie per SSR consistency (evitare flash)

**Fase 8 — Brand Settings (⭐ importante)**
- Route `/admin/impostazioni/brand`
- Form caricamento logo (react-dropzone → Supabase Storage bucket `brand`)
- Form dati ASD (nome, indirizzo, CF, email, telefono, IBAN)
- Color picker primario/secondario
- Dopo salvataggio, il logo appare nel header dell'admin (no reload necessario)
- Fallback `public/placeholder-logo.svg` se logo non caricato

**Fase 9 — Layout base**
- `app/(admin)/layout.tsx` con sidebar shadcn che mostra:
  - Logo (da BrandSettings)
  - Menu: Dashboard, Alunne, Genitori, Insegnanti, Corsi, Calendario, Stage, Saggio, Finanze, Ricevute, Tesseramenti, Consensi, Comunicazioni, Impostazioni
  - Nome utente + toggle tema + logout in footer sidebar
- `app/(admin)/dashboard/page.tsx` → "Ciao, Giuseppina" (legge nome da DB)
- `app/(teacher)/layout.tsx` → layout minimale (solo Calendario + Presenze)
- `app/(parent)/layout.tsx` → layout genitore base
- Pagine placeholder per tutte le sezioni (con "Coming soon" e un link al PRD)

**Fase 10 — Deploy iniziale**
- Commit strutturato (conventional commits)
- Setup GitHub repo `irpinia-arte-danza/iad-portale`
- Push su main
- Collegamento a Vercel (team IAD)
- Configurazione env vars su Vercel (usa i valori che ti darò dal mio `.env.local`)
- Configurazione dominio `area.irpiniaartedanza.it` su Vercel (io aggiungerò il record DNS su ServerPlan)
- Deploy di verifica

**Regole durante questa sessione**:
- Fermati PRIMA di eseguire comandi che modificano il sistema e chiedi conferma
- Spiegami sempre cosa stai per fare e perché
- Rispetta CLAUDE.md alla lettera: convenzioni, naming, TypeScript strict, commenti in inglese
- UI in italiano, codice in inglese
- Se incontri ambiguità, chiedi prima di inventare
- Commit frequenti con messaggi conventional
- Non installare pacchetti extra senza chiedermi
- Usa shadcn/ui, niente HeroUI o altre UI lib

**Cose che NON fare**:
- Non scrivere codice fittizio o TODO senza chiedere
- Non configurare SumUp/pagamenti online (V2, fuori scope MVP)
- Non toccare DNS (lo faccio io manualmente su ServerPlan e Vercel)
- Non inventare credenziali: se manca una env var, chiedimela
- Non committare segreti
- Non usare `any` TypeScript

**Quando hai finito**, fai un recap:
- ✅ cosa funziona
- ⚠️ cosa sospeso (env vars mancanti, logo da caricare, ecc.)
- 📋 primi 3 task per Sprint 1 (anagrafiche atlete/genitori/insegnanti/corsi)

Pronti? Inizia leggendo CLAUDE.md + PRD + architecture.md + schema.prisma e dimmi cosa hai capito del progetto prima di muovere un file.
```

---

## 📌 Note per te (Federico)

Prima di lanciare il prompt sopra, assicurati di:

1. **Aver creato `.env.local`** partendo da `.env.example`, con i valori reali da 1Password
2. **Aver creato il repo GitHub** `irpinia-arte-danza/iad-portale` (oppure lascia che Claude Code te lo suggerisca dopo)
3. **Aver fatto `git init`** nella cartella

Durante lo Sprint 0, Claude Code ti chiederà:
- Conferme prima di installare pacchetti
- Valori delle env vars (quando serve collegarsi a Supabase)
- Conferma prima del primo deploy
- Colori brand (o partiamo con default blu/viola e li cambi in BrandSettings)

**Durata stimata Sprint 0**: 3-5 ore con Claude Code.

---

## 🔮 Dopo Sprint 0

Gli Sprint successivi avranno prompt dedicati:

- **Sprint 1**: Anagrafiche (atlete + genitori + insegnanti + corsi)
- **Sprint 2**: Calendario + presenze (admin + teacher)
- **Sprint 3**: Pagamenti (entrate) + ricevute PDF categorizzate
- **Sprint 4**: Finanze complete (uscite + cashflow + compensi €15k)
- **Sprint 5**: Area genitore
- **Sprint 6**: Email + solleciti granulari
- **Sprint 7**: Iscrizione online + consensi
- **Sprint 8**: Stage
- **Sprint 9**: Saggio + costumi
- **Sprint 10**: Tesseramenti Endas/CSEN
- **Sprint 11**: Dashboard KPI + export
- **Sprint 12**: Hardening & test

---

_Buon lavoro! 🚀_
_Versione 2.0 — 2026-04-19_
