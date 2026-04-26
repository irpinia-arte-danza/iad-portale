# Storia Sprint — IAD Portale

Cronologia sprint completati + roadmap pianificata. Fonte autoritativa: `git log`.

---

## Sprint completati

### Sprint 0 — Foundation ✅ (pre-20 aprile 2026)
Schema base, auth Supabase, admin shell, routing.

### Sprint 1 — Athletes + Parents ✅ (20 aprile 2026)
CRUD allieve + genitori + relazioni M2M + detail pages.

### Sprint 2 — Teachers + Courses + Payments ✅ (20-21 aprile 2026)
Insegnanti CRUD, corsi CRUD, iscrizioni, pagamenti con scadenze auto-generate.

### Sprint 7 — Financial + Reports ✅ (21 aprile 2026)
6 fasi A-F: Expense CRUD, Corrispettivi XLSX/CSV, Bilancio PDF con chart, Athlete card PDF, Analytics dashboard, Annual ZIP bundle.

### Sprint 7.X — Settings + Admin invite ✅ (21 aprile 2026)
5 tab settings (Account / Associazione / Brand / Ricevute / Admin), logo upload Supabase Storage, admin invite via email, audit log attività.

### Integration loghi ✅ (21 aprile 2026)
Loghi dinamici in sidebar admin (light/dark via CSS), PDF Athlete card, PDF Bilancio, favicon browser. Brand end-to-end consistency.

### Sprint 3 — Email System ✅ (22 aprile 2026)
Sistema email end-to-end. Vedi `docs/email-system.md` per dettagli.

---

## Sprint pianificati (roadmap)

| Sprint | Scope | Stima | Priorità |
|---|---|---|---|
| Import Excel 2024-2026 | Dati storici Giuseppina (exceljs) | 4-8h | Media |
| Sprint 5 Teacher portal | Attendance CRUD + mobile-first | 8-10h | Alta (post email) |
| Sprint 4 Parent portal | Scadenze + pagamenti + PDF | 6-8h | Media |
| SumUp integration | Payment link + reconciliation | TBD | Variabile |
| Sprint 6 Stage/Saggio | Stage + costumi + partecipazione | 5-7h | Maggio-giugno |
| Sprint 8 Polish/Security | RLS audit + rate limit + GDPR | 5-7h | Pre go-live |

Batch tasks accumulati:
- **Batch Form Refactor** (~3-4h): BUG#5 parent page + form unico allieva+genitori
- **Batch Schema Changes** (~3-5h): quota annuale Course, Teacher-Course M2M, certificato medico, rollover AA, add SIAE a `ExpenseType`
- **CLAUDE.md split** (questa sessione completa ~30 min)

---

## Pianificazione originale (tabella MVP → V2)

Tabella di riferimento storica pre-divergenza esecuzione:

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

> L'ordine di esecuzione reale è divergente — il sistema email (Sprint 3 Email) è stato implementato prima di altri sprint MVP per sbloccare Giuseppina sui solleciti. Fonte di verità sugli sprint completati: sezione sopra + `git log`.

---

## Stats cumulate

- Commit totali production: **39** (al 22 aprile 2026)
- Coverage workflow IAD: ~99.5% (admin side)
- Parent portal: 0% (Sprint 4 futuro)
- Teacher portal: 0% (Sprint 5 futuro)

---

## Filosofia sprint

- Modulare, sprint-by-sprint
- Schema-first per ogni feature
- Test manuale post-implementation prima del commit
- Stop naturali post-sprint, no marathons
