<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project Context

IAD Portale — gestionale web per A.S.D. Irpinia Arte Danza (Montella, AV).
Per contesto completo, leggere `CLAUDE.md` (stack, schema, convenzioni, principi). I gotcha tecnici §17.x sono ora in `docs/gotchas.md` (split v4.0 del 2026-04-24).

## Stack Core

- Next.js 16.2.4 Turbopack + React 19 + TypeScript strict
- Tailwind v4 + shadcn/ui (tokens in `src/app/globals.css`)
- Prisma 6.19.3 + Postgres Supabase
- Auth Supabase + Storage (bucket `brand` pubblico)
- Resend API per email + webhook svix

## Comandi Essenziali

- `npm run dev` — dev server (porta 3000)
- `npm run build` — production build + TS check
- `npm run db:migrate -- --name <nome>` — crea migration e applica
- `npm run db:seed` — popola DB con dati base
- `npx dotenv -e .env.local -- npx prisma studio` — DB GUI (env production!)
- `npx dotenv -e .env.local -- npx tsx scripts/test-email.ts <email>` — test invio Resend

## Convenzioni Commit

- Tipi: `feat(sprint-N.M):`, `fix(area):`, `docs:`, `refactor:`, `chore:`
- Commit separati per feature distinte
- Messaggi in italiano, descrittivi (non "update" generico)
- No commit messages con body che cita Claude/AI tooling

## Security Constraints

- MAI committare `.env` / `.env.local` (gitignore copre `.env*`)
- Env vars prod via Vercel Dashboard Environment Variables, MAI con virgolette
- Schema destructive migration: usa `prisma migrate diff --script` per bypass
  AI safety gate Prisma 6 non-interactive
- Resend client lazy init (no top-level throw) per build-time safety Next.js
- Webhook endpoints: HMAC signature verify obbligatoria (svix per Resend)

## Documenti di Riferimento

- `CLAUDE.md` — contesto progetto + principi stabili (index dei docs)
- `docs/gotchas.md` — gotcha tecnici §17.x (Prisma, Next.js, Zod/RHF, shadcn, PDF, Vercel, UX, Settings, Domain) con TOC per topic
- `docs/email-system.md` — Sprint 3 Email completo (architettura + 9 fasi + gotcha §17.25-27 + file principali + env vars)
- `docs/sprints.md` — cronologia sprint completati + roadmap pianificata
- `docs/PRD.md` — product requirements (se esiste)
- `docs/architecture.md` — decisioni architetturali (ADR)
- `prisma/schema.prisma` — source of truth schema DB
- `/admin/email-templates` — edit runtime testi email Giuseppina
