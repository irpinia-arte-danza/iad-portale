# Sistema Email IAD Portale — Sprint 3

Sistema email end-to-end per gestione comunicazioni Giuseppina ↔ famiglie.
Chiuso 22 aprile 2026, 9 fasi, commit range `fd17f49..b2aabd6`.

---

## Panoramica architettura

### Provider e mittente
- **Resend API** con dominio `irpiniaartedanza.it` verified (SPF / DKIM / DMARC)
- Mittente virtuale `notifiche@irpiniaartedanza.it`, Reply-To `info@irpiniaartedanza.it`
- Client lazy init in `src/lib/resend/client.ts` (throw solo al primo call, non al module load — vedi §17.27)

### Template editor (runtime, senza deploy)
- UI `/admin/email-templates` — Giuseppina edita `subject`, `bodyHtml`, `bodyText`, `isActive`
- Panel variabili inserimento at-cursor (`{{genitore_nome}}`, `{{allieva_nome}}`, `{{importo}}`, `{{data_scadenza}}`, `{{mese}}`, `{{corso_nome}}`, `{{tipo_quota}}`)
- Live preview con sostituzione variabili
- Seed iniziale 4 template: `sollecito-scadenza`, `promemoria-scadenza`, `benvenuto-iscrizione`, `conferma-pagamento`
- Template aggiunti via migration: `cert-reminder` (Fase 1.C), `stage-invite` (Sprint 6.A), `accesso-portale` e `recupero-password` (Sprint onboarding, vedi sezione dedicata sotto)
- Categorie (`EmailCategory`): `SOLLECITO`, `PROMEMORIA`, `BENVENUTO`, `CONFERMA`, `COMUNICAZIONE`

### Invio manuale bulk
- Pagina dedicata `/admin/scadenze` con filtri (stato, giorni ritardo, corso, scadenza range) + CSV export
- Dialog invio bulk: select template + preview live (con dati scadenza reale) + partial success reporting
- Resend batch API con `batchValidation: "permissive"` (un invio fallito non blocca gli altri)

### Invio automatico (Vercel Cron) — SPENTO da settembre 2026
- **Il cron non è più in `vercel.json`.** Partiva il giorno dopo la scadenza: con l'audit #8 aperto (un pagamento può non chiudere la scadenza giusta) avrebbe scritto a famiglie che hanno pagato in contanti in sala. Da settembre 2026 promemoria e solleciti li manda l'admin a mano da `/admin/scadenze` (anteprima e invio non dipendono dal cron).
- La route resta nel codice per l'invio manuale: `curl -H "Authorization: Bearer $CRON_SECRET" https://area.irpiniaartedanza.it/api/cron/reminders` **invia davvero** le email delle milestone del giorno (se `ReminderConfig.enabled`). Per riaccenderlo: rimettere in `vercel.json` la voce `{ "path": "/api/cron/reminders", "schedule": "0 7 * * *" }`.
- Com'era configurato: endpoint `/api/cron/reminders` daily `0 7 * * *` UTC (8:00 Roma inverno / 9:00 estate)
- 3 milestone: `PROMEMORIA_DUE` (N giorni prima scadenza), `SOLLECITO_FIRST` (N giorni dopo), `SOLLECITO_SECOND` (M giorni dopo, M>N)
- Dedup via `EmailLog.findFirst({ paymentScheduleId, milestoneKey, status != FAILED })` — vedi §17.25
- Sender fallback chain: `ReminderConfig.updatedBy` → primo admin by `createdAt asc`
- Skip weekend opzionale (config runtime `excludeWeekends`)
- Auth double: header `x-vercel-cron` (automatic Vercel) OR `Bearer ${CRON_SECRET}`
- Kill switch globale (`ReminderConfig.enabled = false`) → cron gira ma non invia

### Configurazione runtime
- UI `/admin/settings` Tab Reminder (singleton `ReminderConfig`)
- Campi: `enabled`, `daysBeforeDue`, `firstReminderDaysAfter`, `secondReminderDaysAfter`, `excludeWeekends`
- Preview "Prossimi invii oggi" con count + top 5 recipients per milestone

### Webhook delivery (svix HMAC)
- Endpoint `/api/webhooks/resend` con `svix` signature verify (env `RESEND_WEBHOOK_SECRET`)
- 5 eventi gestiti: `email.delivered`, `email.opened`, `email.bounced`, `email.complained`, `email.delivery_delayed`
- Status progression `EmailLog`: `SENT → DELIVERED → OPENED` (`BOUNCED` / `COMPLAINED` override)
- Timestamps granulari: `deliveredAt`, `openedAt`, `bouncedAt`, `complainedAt`
- `email_id` sconosciuto → 200 skip (no retry storm); DB update fail → 500 (Resend retry)

### Audit e storico
- `EmailLog` record completo: `providerId` (Resend UUID), `triggeredBy` (`ADMIN_MANUAL` | `CRON` | `SELF_SERVICE`), `milestoneKey` (nullable), `bodyHtml` snapshot, `recipientEmail`, refs `athleteId` / `parentId` / `paymentScheduleId`
- `triggeredBy = SELF_SERVICE`: email richiesta dall'utente stesso (oggi solo "Password dimenticata"); `sentBy` è l'utente che ha fatto la richiesta
- `milestoneKey` in uso: `PROMEMORIA_DUE` / `SOLLECITO_FIRST` / `SOLLECITO_SECOND` (cron), `STAGE_INVITE:{stageId}` (inviti stage), `ACCESS_INVITE` / `ACCESS_REINVITE` / `PASSWORD_RESET` (link personali, vedi sotto)
- Storico in detail `/admin/athletes/[id]` + `/admin/parents/[id]`: Card "Storico email" con table (Data, Oggetto, Template, Destinatario, Stato badge 7 colori, Trigger badge)
- Dropdown per riga: Anteprima contenuto · Dettagli tecnici · Reinvia (solo `FAILED`)
- Reinvio crea NUOVO `EmailLog` (no update dell'esistente — audit trail coerente)

### Branding email
- Lingua italiana, tono caldo ma professionale
- Logo IAD in header (dal `BrandSettings` caricato da admin)
- Dati ASD in footer (ragione sociale, CF, indirizzo)

---

## Email con link personale — accesso e recupero password (Sprint onboarding, settembre 2026)

### Perché non passano dall'SMTP di Supabase
Inviti e recupero password **non** usano più `inviteUserByEmail` / `resetPasswordForEmail` (SMTP Supabase + template della dashboard Supabase). Il flusso è:

1. `auth.admin.generateLink({ type: "invite" | "recovery", email })` → restituisce `hashed_token`, **non invia email e non applica rate limit Supabase**
2. Link costruito da `NEXT_PUBLIC_APP_URL` (mai dall'header Host: eviterebbe il password-reset poisoning): `/auth/confirm?token_hash=…&type=invite|recovery[&intent=access]`
3. Invio con Resend (`sendEmail`) + riga `EmailLog`

Vantaggi: template modificabili in `/admin/email-templates`, storico e delivery tracking (bounce visibili), nessuna dipendenza dai template della dashboard Supabase, nessun limite "30 email/ora" dello SMTP Supabase.

Scelta del tipo di link: account Supabase mai confermato → `invite` (sovrascrive il token precedente: il vecchio link smette di funzionare); account confermato ma senza password → `recovery`. La **durata** del link resta quella di "Email OTP Expiration" in Supabase (impostata a 86400, vedi gotcha §17.35).

### Template
| Slug | Categoria | Uso | Variabili |
|---|---|---|---|
| `accesso-portale` | `BENVENUTO` | "Invia / Reinvia accesso" admin (genitori e insegnanti) | `destinatario_nome`, `area_nome`, `descrizione_area`, `link_accesso`, `link_recupero`, `asd_nome`, `asd_email` |
| `recupero-password` | `COMUNICAZIONE` | `/password-dimenticata` | `destinatario_nome`, `link_accesso`, `link_recupero`, `asd_nome`, `asd_email` |

- Seed nella migration `20260915090100_onboarding_access_email_templates` (idempotente, `ON CONFLICT DO NOTHING`)
- Default identici in `src/lib/auth/access-emails.ts`: usati se il template manca, è disattivato o non contiene più `{link_accesso}` (l'accesso non si blocca per una modifica al template)
- Valori delle variabili escapati in HTML prima della sostituzione

### milestoneKey e stato accesso
| milestoneKey | Quando | `parentId` |
|---|---|---|
| `ACCESS_INVITE` | primo invio riuscito all'indirizzo attuale | valorizzato per genitori, `null` per insegnanti |
| `ACCESS_REINVITE` | invii successivi | idem |
| `PASSWORD_RESET` | richiesta da "Password dimenticata" (`triggeredBy = SELF_SERVICE`) | valorizzato se l'utente è un genitore |

- Lo stato **Invitato (data)** di genitori e insegnanti è ricavato dall'ultimo log `ACCESS_*` non `FAILED` all'indirizzo attuale (`src/lib/auth/access-status.ts`): nessun campo `invitedAt` su Parent/Teacher. Un log `BOUNCED`/`COMPLAINED` mostra "email non consegnata".
- **Il link non viene salvato**: in `bodyHtml`/`bodyText` del log è sostituito da `[link personale non salvato]`. Per questo le email con questi milestone **non** sono reinviabili dal menu "Reinvia" dello storico (bloccato in UI e in `resendFromLog`): si usa "Reinvia accesso".

### Limiti di invio (Resend)
- **10 richieste/secondo** per team
- **Quota giornaliera sul piano Free** (100 email/giorno, 3.000/mese): invii massivi di accessi + solleciti cron dello stesso giorno contano insieme
- Invio multiplo accessi (`bulk-access-invite-dialog.tsx`): sequenziale lato client, ~1 invio/secondo. Su `rate_limit_exceeded` / `daily_quota_exceeded` / `monthly_quota_exceeded` si ferma con messaggio esplicito. Nessuna coda né retry: chi non riceve l'email resta nello stato precedente e si rilancia l'invio sui restanti.

### Anti-abuso "Password dimenticata"
- Risposta identica per email registrate e non; l'invio avviene dopo la risposta con `after()` (nemmeno i tempi rivelano se l'account esiste)
- Invia solo a utenti attivi con profilo attivo; max 3 email/ora e 1/minuto per indirizzo (conteggio su `EmailLog`)

---

## Cronologia Sprint 3 (9 fasi)

9 fasi end-to-end, commit range `fd17f49..b2aabd6`, chiuso 22 aprile 2026.

- **Fase 1** — Infrastructure Resend (5 file in `src/lib/resend/`)
- **Fase 2** — Schema `EmailTemplate` + `EmailLog` (drop+recreate stub pre-esistente, audit zero-coupling — vedi §17.24)
- **Fase 3** — Widget KPI dashboard (superset 2 card esistenti)
- **Fase 4** — Pagina `/admin/scadenze` dedicata (filtri + bulk select + CSV export)
- **Fase 5** — Dialog invio bulk con template select + preview live + partial success (Resend batch API `permissive`)
- **Fase 6** — Template editor `/admin/email-templates` (textarea + live preview + variable panel at-cursor insert)
- **Fase 7** — Vercel Cron auto-reminder + `ReminderConfig` UI + dedup per `milestoneKey`
- **Fase 8** — Webhook Resend svix HMAC + status progression
- **Fase 9** — Tab storico email in detail allieva + genitore

---

## Gotcha specifici email

### §17.25 — milestoneKey per dedup cron

**§17.25 Email cron — `milestoneKey` per dedup**: quando cron invia più email con stesso `templateSlug` ma contesto diverso (es. `sollecito-scadenza` per `SOLLECITO_FIRST` +7gg e `SOLLECITO_SECOND` +15gg sulla stessa scadenza), un campo `templateSlug` da solo non basta come dedup key. Servono entrambi: `(paymentScheduleId, milestoneKey)`. Manual send → `milestoneKey = null`. Cron send → uno di `PROMEMORIA_DUE` / `SOLLECITO_FIRST` / `SOLLECITO_SECOND`. Query dedup: `EmailLog.findFirst({ paymentScheduleId, milestoneKey, status != FAILED })` — `FAILED` escluso per permettere retry. Indice composito `@@index([paymentScheduleId, milestoneKey])` obbligatorio. Scoperto: Sprint 3.7 Vercel Cron, aprile 2026.

### §17.26 — Resend webhook svix HMAC

**§17.26 Resend webhook — svix HMAC**: Resend webhook usa formato svix standard (header `svix-id`, `svix-timestamp`, `svix-signature`). Install `svix` package e usa `new Webhook(secret).verify(rawBody, headers)` per HMAC verification. Env var `RESEND_WEBHOOK_SECRET` formato `whsec_...` generato al setup endpoint in Resend Dashboard. **Critico**: leggere body come `await request.text()` (non `.json()`) — svix richiede il raw body esatto per computare la firma. Convertire in JSON solo DOPO verify. 401 se invalida, 200 skip se `email_id` sconosciuto (no retry storm), 500 se DB update fallisce (Resend retry). Scoperto: Sprint 3.8, aprile 2026.

### §17.27 — Lazy client init per build-safe

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

> Nota: §17.27 vive anche in `docs/gotchas.md` sezione Next.js perché è regola general-purpose, non solo email-specifica. Duplicazione intenzionale per discovery in entrambi i contesti.

---

## File principali

- `src/lib/resend/client.ts` — client lazy-init
- `src/lib/resend/send-email.ts` — invio singolo
- `src/lib/resend/send-batch.ts` — invio bulk Resend batch API
- `src/lib/resend/render-template.ts` — rendering con `substituteVariables`
- `src/lib/resend/template-vars.ts` — helper regex `/{name}/`
- `src/app/api/cron/reminders/route.ts` — cron endpoint Vercel
- `src/app/api/webhooks/resend/route.ts` — webhook delivery status
- `src/app/(admin)/admin/email-templates/` — template editor UI
- `src/app/(admin)/admin/scadenze/` — pagina + dialog invio
- `src/app/(admin)/admin/settings/_components/reminder-tab.tsx` — config cron
- `src/app/(admin)/admin/_components/email-log/` — storico condiviso athletes/parents
- `src/lib/auth/access-emails.ts` — link personali (generateLink) + invio e log di accesso/recupero password
- `src/lib/auth/access-status.ts` — stato accesso a 4 valori da `auth.users` + `EmailLog`
- `src/app/(admin)/admin/_components/access/` — badge stato, bottone invio, card scheda, dialog invio multiplo
- `src/app/(public)/password-dimenticata/` e `src/app/(account)/imposta-password/` — recupero e scelta password

---

## Env vars richieste

- `RESEND_API_KEY` — API key Resend
- `RESEND_WEBHOOK_SECRET` — signing secret svix (`whsec_...`)
- `CRON_SECRET` — auth curl manuale cron (Vercel Cron usa header `x-vercel-cron` automatico)
- `NEXT_PUBLIC_APP_URL` — base dei link personali di accesso/recupero. In locale va sovrascritta (es. `.env.development.local` con `http://localhost:3000`), altrimenti i link dei test puntano alla produzione
- `SUPABASE_SERVICE_ROLE_KEY` — necessaria per `auth.admin.generateLink`
