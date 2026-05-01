# Runbook — Procedure operative IAD Portale

> Procedure manuali una-tantum (setup infrastrutturale, RLS, configurazioni
> esterne) che non possono essere automatizzate via codice/migrations.
> Tracciate qui per onboarding e disaster recovery.

---

## Supabase Storage — RLS policy bucket `medical-certificates`

**Fase**: 1.C (post-deploy)
**Quando**: una-tantum, da eseguire dopo creazione bucket `medical-certificates`.

### Contesto

Il bucket `medical-certificates` (Supabase Storage) contiene certificati
medici delle allieve. Il pattern attuale usa `createAdminClient` con
`SUPABASE_SERVICE_ROLE_KEY` lato server, **bypassando RLS** sia in lettura
che scrittura. Le policy seguenti sono **defense-in-depth**: se in futuro
introduciamo lettura cert da client SDK auth (es. genitore visualizza cert
del figlio nel parent portal), le policy garantiscono che solo admin
autenticati possano leggerli.

### Setup (Supabase Dashboard → Storage → medical-certificates → Policies)

**Policy 1 — Admin manage (FOR ALL)**:

```sql
CREATE POLICY "Admin can manage medical certs"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'medical-certificates' AND
  auth.uid() IN (
    SELECT id FROM users
    WHERE role = 'ADMIN' AND is_active = true
  )
)
WITH CHECK (
  bucket_id = 'medical-certificates' AND
  auth.uid() IN (
    SELECT id FROM users
    WHERE role = 'ADMIN' AND is_active = true
  )
);
```

**Policy 2 — Admin read (FOR SELECT)**:

```sql
CREATE POLICY "Admin can read medical certs"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'medical-certificates' AND
  auth.uid() IN (
    SELECT id FROM users
    WHERE role = 'ADMIN' AND is_active = true
  )
);
```

### Verifica

1. Login come admin → `/admin/medical-certificates` → upload + download cert: OK
2. Login come parent (se introdotta visibilità futura) senza policy parent
   esplicita: download deve fallire con `403`/`404`.
3. Audit log `CERT_CREATE` / `CERT_UPDATE` correttamente registrato.

### Note

- Il bucket deve essere **privato** (no public read).
- File path convention: `{athleteId}/{certId}.{ext}` (vedi
  `src/lib/supabase/storage-medical-cert.ts`).
- Signed URL TTL: 24h, refresh on demand via `refreshMedicalCertSignedUrl`.
- Hard delete allieva (Fase 1.C `/admin/cestino`) chiama
  `deleteAllMedicalCertFilesForAthlete` per cleanup `{athleteId}/*`.

---

## Cron Vercel — verifica esecuzioni

**Cron registrati**:
- `/api/cron/reminders` — invio automatico promemoria pagamenti (Sprint 3)
- `/api/cron/academic-year-rollover` — auto-set isCurrent (Fase 1.A)

**Verifica**: Vercel Dashboard → Project → Settings → Cron Jobs → log
ultime 10 esecuzioni.

---

## Endas / CSEN — invio tesseramenti

Non esiste API: il flusso resta manuale.
1. Admin → `/admin/athletes` → filtro "da tesserare" → export PDF Endas/CSEN.
2. Email PDF al referente ente.
3. Quando il referente conferma con numero tessera → Admin aggiorna
   `Affiliation` con `cardNumber` + `confirmedAt`.
