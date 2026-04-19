# PRD — IAD Portale
## Product Requirements Document — v2.0

> **Cliente**: A.S.D. IAD Irpinia Arte Danza (Montella, AV)
> **Stakeholder primario**: Giuseppina Ciociola (titolare)
> **Sviluppatore**: Federico Passaro
> **Data**: Aprile 2026
> **Status**: Kickoff v2.0 (aggiornato con tutte le decisioni)

---

## 1. Executive summary

### Problema
La A.S.D. IAD Irpinia Arte Danza gestisce oggi tutta l'operatività in modo cartaceo/foglio:
- 64 iscritte (target 100 nel 2026/27), 5 corsi, 1 sede in comodato
- Ricevute **scritte a mano** dalla titolare
- Presenze su registro cartaceo
- **Contabilità entrate/uscite su Google Drive** → è un casino
- Scadenze (pagamenti, certificati medici) tracciate a memoria
- Tesseramenti Endas/CSEN inviati al referente con liste su email
- Comunicazioni con genitori via email singole, caso per caso
- Compenso Giuseppina tracciato a occhio vs soglia €15.000

### Soluzione
**IAD Portale**: gestionale web con tre aree:
- **Backend admin** (Giuseppina): gestione completa con sezione Finanze integrata (entrate + uscite + cashflow + compensi)
- **Area insegnante**: interfaccia minimale per segnare presenze del proprio corso
- **Area genitori**: consultazione + iscrizione a stage/saggio + pagamenti tracciati

Il gestionale **convive con il cartaceo** (Interpretazione A): i moduli cartacei restano validi; Giuseppina li digitalizza a posteriori. In parallelo, un form online permette iscrizioni digitali native.

### Obiettivi misurabili
- Ridurre tempo di emissione ricevuta da ~5 min (a mano) a < 30 sec (automatico)
- Sostituire gestione contabilità su Drive con cashflow strutturato
- Azzerare dimenticanze su scadenze certificato medico (oggi ~2-3 all'anno)
- Ridurre del 70% le domande email da genitori
- Monitoraggio automatico soglia €15.000 compensi Giuseppina
- Zero errori di calcolo quote

---

## 2. Personas

### 🎩 Giuseppina (admin)
**Età**: 30-40 · **Skill tech**: media · **Device**: MacBook + iPhone

**Cosa fa oggi**:
- Risponde a WhatsApp/email dei genitori
- Raccoglie moduli cartacei all'iscrizione
- Incassa quote (contanti, bonifico, POS)
- **Scrive ricevute a mano**
- Tiene registro presenze cartaceo
- **Gestisce contabilità entrate/uscite su Drive**
- Manda PDF iscritti al referente Endas/CSEN via email
- Organizza saggio, costumi, stage, eventi

**Pain points**:
- "Non ricordo chi mi ha pagato e chi no"
- "I certificati medici sono un incubo"
- "Scrivere le ricevute mi porta via un pomeriggio al mese"
- "La contabilità su Drive è un casino"
- "Non so mai quanto ho preso di compenso totale nell'anno"
- "I genitori mi chiedono sempre le stesse cose"

**Obiettivi dal sistema**:
- Vedere a colpo d'occhio chi ha pagato/non pagato
- Generare ricevute in 3 click
- Alert automatici su scadenze
- **Cashflow strutturato** con entrate, uscite, DELTA cassa
- **Progress bar compenso** vs soglia €15.000
- Meno domande ripetitive dai genitori

### 👩‍🏫 Francesca (aiutante insegnante)
**Età**: 25-35 · **Skill tech**: media · **Device**: tablet o telefono

**Cosa fa**:
- Aiuta Giuseppina in alcune lezioni
- Vede le alunne del corso che tiene
- Segna presenze a bordo sala

**Obiettivi dal sistema**:
- Login rapido da telefono/tablet
- Vedere il suo calendario settimanale
- Checkbox presenza/assenza in pochi secondi
- Niente accesso a pagamenti o dati contabili

### 👨‍👧 Mario (genitore)
**Età**: 35-50 · **Skill tech**: media · **Device**: smartphone principalmente

**Cosa vuole**:
- Vedere che la figlia ha pagato il mese
- Scaricare ricevute per il 730
- Iscrivere la figlia a stage e saggio
- Sapere quando è il saggio e quanto costano i costumi
- Verificare le presenze della figlia
- Ricevere reminder prima delle scadenze
- Eventualmente disattivare i solleciti automatici se preferisce altro canale

---

## 3. Scope e non-scope

### ✅ IN SCOPE (MVP + V1)
- Anagrafica atlete, genitori, insegnanti, corsi
- Calendario lezioni + registro presenze digitale (admin + teacher)
- **Stage** (admin crea, genitori iscrivono)
- **Saggio** (partecipazione, quote rate, costumi/accessori)
- **Entrate**: quote mensili, associative, stage, saggio, costumi
- **Uscite**: affitto, F24, compensi, costumi, utenze, affiliazioni, ecc.
- **Cashflow unificato** (vista per anno fiscale + anno accademico)
- **Compenso Giuseppina** con progress bar vs €15.000
- Generazione **ricevute sportive PDF** numerate (categorizzate: regolari / saggio / costume / prestazione)
- **Ricevuta in bianco** (template precompilato da compilare al volo)
- **Solleciti automatici** configurabili (giorni + override per genitore + tasto manuale)
- **Tesseramenti Endas/CSEN** con export PDF per referente
- Area genitore (consultazione + iscrizione stage/saggio)
- Area insegnante (presenze + calendario)
- Iscrizione online con 5 consensi + versioning documenti
- Alert automatici email (pagamento, certificato medico)
- Upload e archiviazione moduli cartacei scansionati
- Generazione moduli precompilati PDF (da stampare/firmare)
- **Brand Settings**: logo caricabile, colori, dati ASD
- Dashboard riassuntiva admin
- Export completo dati (backup CSV/XLSX/JSON)
- Export GDPR (diritto di accesso/cancellazione)
- **Tema dark/light** con toggle utente

### 🔄 FUTURE (V2+)
- **SumUp Payment Links** (pagamenti online via link, API SumUp)
- WhatsApp Business API integrato
- App mobile nativa (per ora: web responsive basta)
- Fatturazione elettronica
- Multi-sede / multi-ASD (white-label)
- Gestione magazzino costumi
- Vendita biglietti saggio
- QR code check-in presenze

### ❌ OUT OF SCOPE
- Sito vetrina `irpiniaartedanza.it` (fase separata)
- Social media management
- Contabilità generale completa (il bilancio finale resta al commercialista)
- Payroll insegnanti complesso
- CRM marketing avanzato

---

## 4. Requisiti funzionali

### 4.1 Autenticazione & ruoli

**FR-AUTH-01** — Login email+password (Supabase Auth + Resend SMTP)
**FR-AUTH-02** — Reset password via email
**FR-AUTH-03** — Account creato solo da admin (niente self-signup). Eccezione: iscrizione online che crea account "pending".
**FR-AUTH-04** — Ruoli: `admin`, `parent`, `teacher` — tutti e tre attivi dall'MVP
**FR-AUTH-05** — 2FA opzionale per admin
**FR-AUTH-06** — Sessioni con refresh automatico, logout inattività 7 giorni
**FR-AUTH-07** — Preferenza tema (light/dark) salvata in `User.themePreference`

### 4.2 Anagrafica atleta

**FR-ATH-01** — Creazione atleta con campi obbligatori:
- Nome, Cognome, Data nascita, Luogo nascita, Provincia
- Codice fiscale (validato)
- Residenza (via, civico, città, CAP, provincia)
- Almeno 1 genitore/tutore associato (se minore)
- Email contatto (genitore se minore, atleta se maggiorenne)
- Telefono

**FR-ATH-02** — Campi opzionali: foto, note mediche, note istruttore, taglia divisa
**FR-ATH-03** — Stato: `trial`, `active`, `suspended`, `withdrawn`
**FR-ATH-04** — Storico cambi di stato con timestamp
**FR-ATH-05** — Associazione a uno o più corsi
**FR-ATH-06** — Campo "fonte acquisizione"
**FR-ATH-07** — Soft delete

### 4.3 Anagrafica genitore

**FR-PAR-01** — Un genitore può avere 1-N figli
**FR-PAR-02** — Un'atleta può avere 1-N genitori
**FR-PAR-03** — Flag "pagante principale"
**FR-PAR-04** — Flag "autorizzato al ritiro"
**FR-PAR-05** — Account utente linkato (opzionale)
**FR-PAR-06** — **Flag `remindersEnabled`**: il genitore può avere solleciti automatici disattivati (o l'admin lo fa per lui)

### 4.4 Anagrafica insegnante

**FR-TEA-01** — Creazione insegnante con campi base (nome, CF, email, qualifiche)
**FR-TEA-02** — Associazione a uno o più corsi
**FR-TEA-03** — Account utente linkato (Supabase Auth) con ruolo `teacher`
**FR-TEA-04** — Interfaccia insegnante semplificata: solo calendario proprio + presenze

### 4.5 Corsi e calendario

**FR-COR-01** — 5 corsi predefiniti estensibili
**FR-COR-02** — Ogni corso ha: livello, fascia età, quota mensile/trimestrale, durata lezione, capienza, insegnante
**FR-COR-03** — Orario settimanale ricorrente con data inizio/fine
**FR-COR-04** — Generazione automatica lezioni per l'anno accademico
**FR-COR-05** — Calendario visualizzabile per: corso, sala, settimana, mese
**FR-COR-06** — Gestione chiusure (festività, chiusure scolastiche, chiusure straordinarie)

### 4.6 Presenze (admin + insegnante)

**FR-PRES-01** — Vista lezione del giorno → lista iscritte → checkbox presente/assente
**FR-PRES-02** — Stati: `present`, `absent` (senza giustificazioni — non servono)
**FR-PRES-03** — Note facoltative
**FR-PRES-04** — Modifica presenze entro 7 giorni (poi solo con audit log)
**FR-PRES-05** — Genitore vede presenze proprio figlio (solo lettura)
**FR-PRES-06** — **Insegnante** vede solo lezioni/presenze del proprio corso
**FR-PRES-07** — Registro presenze mensile stampabile

### 4.7 Stage ⭐

**FR-STG-01** — Admin crea stage: titolo, descrizione, data, orario, location, capienza, quota, deadline iscrizione
**FR-STG-02** — Stage visibile nell'area genitore
**FR-STG-03** — Genitore iscrive figli (più figli possibili)
**FR-STG-04** — Al raggiungimento capienza, iscrizioni si chiudono
**FR-STG-05** — Admin registra pagamento iscrizione stage
**FR-STG-06** — Export PDF partecipanti
**FR-STG-07** — Cancellazione iscrizione (con o senza rimborso a discrezione admin)

### 4.8 Saggio ⭐

**FR-SAG-01** — Creazione evento saggio annuale (giugno)
**FR-SAG-02** — Quota saggio con 2 rate (entro gennaio, entro aprile)
**FR-SAG-03** — Adesione atleta (opt-in dal genitore)
**FR-SAG-04** — Gestione **costumi**: definizione catalogo costumi con costo, assegnazione per gruppo coreografico
**FR-SAG-05** — Gestione **accessori**: scarpette, trucchi, ecc.
**FR-SAG-06** — Pagamento costumi separato da quota saggio
**FR-SAG-07** — Report partecipanti, pagamenti saggio, costumi
**FR-SAG-08** — Elenco backstage stampabile

### 4.9 Entrate (Payments) ⭐

**FR-PAY-01** — Admin registra pagamento: atleta → tipo quota → metodo (contanti/bonifico/POS) → data → importo
**FR-PAY-02** — Generazione automatica ricevuta PDF numerata
**FR-PAY-03** — Numerazione differenziata:
- Regolari: `IAD/2025-26/196`
- Saggio: `IAD/2025-26/45/S`
- Costume: `IAD/2025-26/4/C`
- Prestazione: `IAD/2025-26/4`

**FR-PAY-04** — Tipi di quota: associativa, mensile, trimestrale, stage, saggio (rate), costume, altro
**FR-PAY-05** — Dashboard "morosità": chi ha pagato e chi no per il mese corrente
**FR-PAY-06** — **Storno pagamento** con motivo (mai cancellazione fisica)
**FR-PAY-07** — Stato atleta automatico: se morosa > N giorni → warning → sospesa
**FR-PAY-08** — Ogni Payment referenzia **sia** `academicYearId` **che** `fiscalYearId`

### 4.10 Uscite (Expenses) ⭐ NUOVO

**FR-EXP-01** — Admin registra uscita: tipo, importo, metodo, data, descrizione, destinatario
**FR-EXP-02** — Tipi (enum `ExpenseType`): affitto, F24, utenze, compenso, acquisto costumi, materiale, assicurazione, affiliazione, altro
**FR-EXP-03** — Upload scansione fattura/ricevuta pagamento
**FR-EXP-04** — Ogni Expense referenzia `fiscalYearId` (obbligatorio) + opzionalmente `academicYearId`

### 4.11 Cashflow unificato ⭐ NUOVO

**FR-CF-01** — Vista unica entrate + uscite con filtri:
- Anno fiscale (gennaio-dicembre)
- Anno accademico (settembre-giugno)
- Mese
- Tipologia / causale
- Metodo pagamento
- Ricerca testuale

**FR-CF-02** — Stat card in alto:
- Totale Entrate (con confronto anno precedente)
- Totale Uscite
- **DELTA Cassa** (entrate - uscite) con breakdown Bonifici/Contanti
- Quote in attesa

**FR-CF-03** — Tab: Panoramica · Movimenti · Entrate · Compensi · Altre uscite · Scadenze · Report
**FR-CF-04** — **Mini-chart** entrate per mese (verdi = già avvenute, grigie = future)
**FR-CF-05** — Export CSV/XLSX per commercialista (per anno fiscale)

### 4.12 Compensi Giuseppina ⭐ FEATURE SPECIFICA

**FR-COMP-01** — Registrazione compenso con data, importo, causale, ricevuta
**FR-COMP-02** — **Progress bar** visibile in dashboard: `€X su €15.000 (anno fiscale)`
**FR-COMP-03** — Alert automatici al raggiungimento: 80%, 90%, 100%
**FR-COMP-04** — Storico compensi anno per anno
**FR-COMP-05** — Generazione ricevuta numerata (`IAD/2025-26/N`)
**FR-COMP-06** — Export report annuale compensi per commercialista

### 4.13 Ricevute PDF

**FR-PDF-01** — Ricevuta sportiva con:
- Logo IAD (da `BrandSettings`)
- Intestazione ASD completa (da `BrandSettings`)
- Dati pagante (genitore o atleta)
- Dati beneficiario (atleta)
- Descrizione quota + periodo
- Importo, data, metodo
- Numerazione progressiva categorizzata
- **Dicitura detraibilità** minori 5-18 anni (art. 15 TUIR)

**FR-PDF-02** — **Ricevuta in bianco**: form veloce (pagante, importo, causale, data) → PDF con intestazione precompilata → salvato come ricevuta "BLANK"
**FR-PDF-03** — Modulo iscrizione precompilato
**FR-PDF-04** — Modulo lezione di prova precompilato
**FR-PDF-05** — Certificazione annuale spese sportive detraibili
**FR-PDF-06** — Registro presenze mensile
**FR-PDF-07** — **Export iscritti Endas** per tesseramento (tabellare, tutti i dati richiesti)
**FR-PDF-08** — **Export iscritti CSEN** per tesseramento
**FR-PDF-09** — **Export iscritti generale** (per uso interno)

### 4.14 Tesseramenti Endas/CSEN ⭐ NUOVO

**FR-TES-01** — Per ogni atleta, tracciamento affiliazione (Endas, CSEN, o entrambi)
**FR-TES-02** — Stato: pending, sent, confirmed, expired
**FR-TES-03** — Numero tessera registrabile quando ricevuto dal referente
**FR-TES-04** — Alert su atlete non tesserate (dopo N giorni dall'iscrizione)
**FR-TES-05** — Generazione PDF export per referente con dati necessari al tesseramento
**FR-TES-06** — Scadenza annuale delle tessere (rinnovo a settembre)

### 4.15 Consensi e documenti legali

**FR-CONS-01** — Tracking 5 consensi obbligatori
**FR-CONS-02** — Ogni consenso: `accepted`, `acceptedAt`, `documentVersion`, `method`, `ipAddress`
**FR-CONS-03** — Revoca foto/video dall'area genitore
**FR-CONS-04** — Versioning documenti: re-consenso richiesto se versione aggiornata
**FR-CONS-05** — Upload scansione modulo cartaceo firmato

### 4.16 Certificato medico e assicurazione

**FR-MED-01** — Upload cert medico + data emissione + data scadenza
**FR-MED-02** — Alert: 30, 15, 3 giorni prima scadenza → email
**FR-MED-03** — Scaduto → blocco marcatura presenza (admin può forzare)
**FR-MED-04** — Copertura assicurativa: attivazione + scadenza + polizza
**FR-MED-05** — Morosità pagamento → auto-sospensione copertura

### 4.17 Area genitore

**FR-PAR-UI-01** — Dashboard: figli iscritti, prossima scadenza pagamento, scadenza certificato
**FR-PAR-UI-02** — Pagina figlio: presenze mensili, corsi, stato
**FR-PAR-UI-03** — Pagina pagamenti: storico + ricevute PDF scaricabili
**FR-PAR-UI-04** — Pagina documenti: regolamento, liberatorie scaricabili
**FR-PAR-UI-05** — Pagina stage: stage disponibili + iscrizione
**FR-PAR-UI-06** — Pagina saggio: info + adesione + stato costumi
**FR-PAR-UI-07** — Pagina impostazioni: toggle solleciti automatici, tema, dati anagrafici
**FR-PAR-UI-08** — Export GDPR: zip con tutti i dati relativi

### 4.18 Area insegnante ⭐ NUOVO

**FR-TEA-UI-01** — Login dedicato
**FR-TEA-UI-02** — Dashboard minimale: prossime lezioni del proprio corso
**FR-TEA-UI-03** — Pagina calendario: settimana/mese, solo propri corsi
**FR-TEA-UI-04** — Pagina presenze: apri lezione → checkbox per ogni atleta
**FR-TEA-UI-05** — Anagrafica alunne del proprio corso (senza contatti sensibili/finanza)
**FR-TEA-UI-06** — Niente accesso a: pagamenti, contabilità, altre classi, impostazioni

### 4.19 Iscrizione online

**FR-ENR-01** — Form pubblico su `/iscrizione`
**FR-ENR-02** — Flow multi-step: dati anagrafici → scelta corsi → upload certificato → 5 checkbox → conferma
**FR-ENR-03** — Creazione record "pending" + notifica admin
**FR-ENR-04** — Admin approva/rifiuta
**FR-ENR-05** — Su approvazione: creazione account genitore + email benvenuto
**FR-ENR-06** — Rate limiting anti-spam

### 4.20 Solleciti automatici ⭐ NUOVO (granularità fine)

**FR-REM-01** — Config globale `ReminderConfig`:
- Flag abilitato/disabilitato globale
- Giorni dopo scadenza per 1° sollecito (default 3)
- Giorni dopo scadenza per 2° sollecito (default 10)
- Giorni per sospensione accesso (default 20)

**FR-REM-02** — Override per genitore (`Parent.remindersEnabled`): se `false`, i solleciti automatici NON vengono inviati a quel genitore
**FR-REM-03** — **Tasto manuale "Invia sollecito ora"** nel profilo genitore/alunna: Giuseppina clicca → email inviata subito (tipo `PAYMENT_REMINDER_MANUAL`) bypassando l'automatismo
**FR-REM-04** — Cron job Vercel (giornaliero) che verifica scadenze e invia email
**FR-REM-05** — Log completo in `EmailLog` con `triggeredBy` (auto/manuale + user id)

### 4.21 Brand Settings ⭐ NUOVO

**FR-BRAND-01** — Sezione `Impostazioni > Brand` (solo admin)
**FR-BRAND-02** — Upload **logo** (SVG/PNG) → Supabase Storage → DB path
**FR-BRAND-03** — Upload logo variante dark mode (opzionale)
**FR-BRAND-04** — Upload favicon
**FR-BRAND-05** — Color picker colore primario e secondario
**FR-BRAND-06** — Form dati ASD: nome, indirizzo, CF, email, telefono, sito, IBAN
**FR-BRAND-07** — Tutto il frontend e i PDF leggono da `BrandSettings`
**FR-BRAND-08** — Fallback a `public/placeholder-logo.svg` se logo non caricato

### 4.22 Comunicazioni

**FR-COM-01** — Email automatiche (vedi flussi in CLAUDE.md)
**FR-COM-02** — Broadcast email: admin scrive a tutti, a un corso, a un gruppo custom
**FR-COM-03** — Bottone "Invia WhatsApp" con messaggio precompilato
**FR-COM-04** — Log email + errori consegna

### 4.23 Dashboard admin & reportistica

**FR-DASH-01** — KPI in alto:
- Alunne attive / target
- Quote incassate mese corrente / previsto
- Certificati in scadenza (30 giorni)
- **Compenso Giuseppina progress bar** (anno fiscale)
- Atlete non tesserate
- DELTA cassa corrente

**FR-DASH-02** — Grafico iscrizioni per corso
**FR-DASH-03** — Grafico incassi mensili (linea)
**FR-DASH-04** — Fonte acquisizione (grafico a torta)
**FR-DASH-05** — Retention: % atlete che riconfermano anno su anno
**FR-DASH-06** — Prossime scadenze: affitto, F24, compensi, quote in attesa, tesseramenti

### 4.24 Export e backup ⭐ NUOVO

**FR-EXP-01** — Export completo dati: ZIP con CSV/XLSX di ogni tabella principale
**FR-EXP-02** — Export per commercialista: movimenti anno fiscale in XLSX
**FR-EXP-03** — Export GDPR per genitore: zip personale
**FR-EXP-04** — Backup automatico giornaliero Supabase (retention 7gg su Free)

---

## 5. Requisiti non funzionali

| Categoria | Requisito |
|---|---|
| **Performance** | TTFB < 500ms, LCP < 2.5s su 4G |
| **Uptime** | 99.5% (copre Vercel + Supabase SLA free) |
| **Responsive** | Perfetto su mobile 375px → desktop 1440px |
| **Accessibilità** | WCAG 2.1 AA (shadcn/Radix sono conformi) |
| **Sicurezza** | HTTPS ovunque, CSP headers, RLS Supabase, rate limiting |
| **GDPR** | Privacy policy, cookie policy, export dati, diritto oblio |
| **Backup** | Supabase backup giornaliero + export manuale admin |
| **Localizzazione** | 100% italiano, formati IT |
| **Tema** | Dark + Light (toggle utente + prefers-color-scheme) |
| **Browser** | Chrome/Safari/Firefox/Edge ultimi 2 major |
| **Dati minori** | Minimizzazione, audit, no analytics invasivi |

---

## 6. Architettura (sintesi)

```
┌─────────────────────────────────────────────────────┐
│  area.irpiniaartedanza.it                           │
│  (Next.js 15 + shadcn/ui + Tailwind, su Vercel)     │
└────────────┬────────────────────────────────────────┘
             │
             │ Server Actions + Route Handlers + Cron
             │
    ┌────────▼────────┐      ┌──────────────┐
    │   Prisma ORM    │      │    Resend    │
    └────────┬────────┘      │   (email)    │
             │               └──────────────┘
    ┌────────▼──────────────────────────────┐
    │  Supabase (Ireland eu-west-1)         │
    │  ├─ Postgres (dati)                   │
    │  ├─ Auth (utenti, sessioni)           │
    │  └─ Storage                           │
    │     ├─ brand/ (logo, favicon)         │
    │     ├─ documents/ (moduli scansionati)│
    │     ├─ certificates/ (medici)         │
    │     ├─ receipts/ (PDF ricevute)       │
    │     └─ expenses/ (fatture uscite)     │
    └───────────────────────────────────────┘
```

Dettagli in `docs/architecture.md`.

---

## 7. Roadmap sprint per sprint

### 🚀 Sprint 0 — Fondamenta (3-5 giorni)
- Setup Next.js 15 + TypeScript + Tailwind + shadcn init
- Integrazione Supabase (client server + browser)
- Prisma + schema iniziale + prima migration
- Auth base (login, logout, middleware route protection)
- **Brand Settings schema + sezione impostazioni + upload logo**
- **Tema dark/light con toggle utente**
- Layout base: (public), (admin), (teacher), (parent)
- Seed dati di test
- Deploy Vercel iniziale

**Done when**: login funziona, dashboard admin mostra logo caricato da admin, toggle tema funzionante

### 🗂️ Sprint 1 — Anagrafiche (5-7 giorni)
- CRUD atlete
- CRUD genitori + linking atlete
- CRUD **insegnanti**
- CRUD corsi (con assegnazione insegnante)
- Validazione codice fiscale
- Upload foto atleta
- DataTable con ricerca/filtri (TanStack Table)

**Done when**: Giuseppina può inserire tutte le 64 iscritte + insegnanti + corsi

### 📅 Sprint 2 — Calendario & presenze (5-7 giorni)
- Gestione anno accademico + fiscale
- Generazione lezioni ricorrenti
- Registro presenze (admin + **teacher**)
- Area insegnante minimale (presenze + calendario suo)
- Viste calendario
- Gestione chiusure

**Done when**: Giuseppina e insegnante segnano presenze in <30 secondi

### 💶 Sprint 3 — Pagamenti & ricevute (5-7 giorni)
- Registrazione pagamenti (entrate)
- **Numerazione ricevute categorizzata**
- Generazione PDF ricevuta (con logo da BrandSettings)
- Ricevuta in bianco (template)
- Dashboard morosità
- Storno pagamenti con audit

**Done when**: ricevuta generata in <30 sec, sostituisce quelle scritte a mano

### 📊 Sprint 4 — Finanze: uscite, cashflow, compensi (5-7 giorni)
- CRUD uscite (expenses) con tipologie
- **Cashflow unificato** entrate+uscite
- Tab Panoramica/Movimenti/Entrate/Compensi/Altre uscite/Scadenze/Report
- **Progress bar compenso Giuseppina** €15.000
- Stat card DELTA cassa con breakdown bonifici/contanti
- Mini-chart entrate mensili
- Export CSV/XLSX

**Done when**: contabilità su Drive è abbandonata, tutto nel gestionale

### 👨‍👧 Sprint 5 — Area genitore (4-5 giorni)
- Login + dashboard genitore
- Visualizzazione figli, presenze, pagamenti
- Download ricevute
- Pagina documenti/regolamento
- **Settings: toggle solleciti on/off**

**Done when**: un genitore trova tutto quello che lo riguarda senza chiedere a Giuseppina

### 📨 Sprint 6 — Email & solleciti configurabili (3-4 giorni)
- Integrazione Resend
- Template email italiane con logo
- **Config solleciti globale**
- **Override per-genitore**
- **Bottone manuale sollecito**
- Cron giornaliero scadenze
- Alert certificato medico

**Done when**: sistema manda solleciti automatici + Giuseppina può disattivarli o forzarli

### 📝 Sprint 7 — Iscrizione online (5-7 giorni)
- Form iscrizione multi-step pubblico
- Versioning documenti legali
- Tracking consensi
- Approvazione admin
- Generazione moduli PDF precompilati

**Done when**: un genitore si iscrive online, Giuseppina approva, account attivo

### 🎪 Sprint 8 — Stage (3-4 giorni)
- CRUD stage (admin)
- Vista stage nell'area genitore
- Iscrizione genitore per proprio figlio
- Registrazione pagamento
- Export partecipanti

**Done when**: uno stage di prova è creato, un genitore si iscrive, Giuseppina registra il pagamento

### 🎭 Sprint 9 — Saggio & costumi (4-5 giorni)
- Evento saggio con rate
- Adesione atleta
- Catalogo costumi + assegnazioni
- Accessori
- Pagamenti separati costumi
- Report partecipanti + elenco backstage

**Done when**: simulazione saggio completa: adesione → costumi → pagamenti → report

### 🏅 Sprint 10 — Tesseramenti Endas/CSEN (2-3 giorni)
- Tracking affiliazioni per atleta
- Stati: pending/sent/confirmed/expired
- **Export PDF tabellare** per referente (Endas, CSEN)
- Alert atlete non tesserate
- Rinnovo annuale

**Done when**: PDF inviabile al referente in 1 click

### 📈 Sprint 11 — Dashboard & report (3-4 giorni)
- KPI dashboard admin completo
- Grafici (Recharts)
- Export completo dati (zip)
- Export GDPR per genitore
- Registro presenze stampabile

### 🧪 Sprint 12 — Hardening
- Test E2E Playwright
- Audit sicurezza + RLS
- Performance tuning
- Documentazione utente (PDF guida)

### 🔮 Sprint V2 — SumUp (se confermato)
- Integrazione API SumUp
- Generazione Payment Links dal gestionale
- Webhook notifica pagamento
- Riconciliazione automatica

---

## 8. Rischi e mitigazioni

| Rischio | Probabilità | Impatto | Mitigazione |
|---|---|---|---|
| Giuseppina non adotta il tool | Media | Alto | Coinvolgerla nei test ogni sprint |
| Dati minori compromessi | Bassa | Altissimo | RLS su ogni tabella, audit log, 2FA admin |
| Free tier Supabase saturato | Bassa | Medio | Monitoring, upgrade a Pro ($25/mese) se necessario |
| Bug su calcolo compensi €15.000 | Bassa | Alto | Test automatici, review manuale prime iterazioni |
| Insegnante vede dati non suoi | Bassa | Alto | RLS specifico + test dedicati |
| SumUp API non disponibile/complesse | Alta | Basso | Già in V2, MVP funziona senza |

---

## 9. Metriche di successo (3 mesi post-lancio)

- **Tempo risparmiato Giuseppina**: stima 8-12 ore/settimana (obiettivo)
- **% genitori attivi**: >70% accedono almeno 1 volta/mese
- **Errori ricevute**: 0
- **Dimenticanze certificato medico**: 0 (vs ~2-3/anno oggi)
- **Tempo medio ricevuta**: <30 sec
- **Contabilità**: 100% nel gestionale, 0% su Drive
- **Compenso Giuseppina sempre monitorato**: mai dubbi sul residuo vs €15.000
- **NPS Giuseppina**: >8/10

---

## 10. Open questions (da chiudere con Giuseppina)

- [ ] **Logo IAD definitivo** in SVG vettoriale (per upload iniziale)
- [ ] **Colore primario brand** (codice HEX preciso)
- [ ] Banca e IBAN per bonifici (da mettere nelle comunicazioni)
- [ ] Orari esatti dei 5 corsi per pre-caricamento calendario 2025/26
- [ ] Lista completa 64 iscritti attuali per import (CSV/XLSX)
- [ ] Referenti Endas e CSEN (nome, email, telefono)
- [ ] Dati compenso Giuseppina 2026 già incassato (per stato iniziale progress bar)
- [ ] Movimenti contabili 2026 già avvenuti (per importare cashflow esistente)
- [ ] SumUp: verificare piano contrattuale e accesso API (per V2)
- [ ] Palette colori saggio/stage/compensi finale

---

_Versione 2.0 — 2026-04-19 — Aggiornato con tutte le decisioni_
