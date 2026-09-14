# Runbook — Procedure operative IAD Portale

> Procedure manuali una-tantum (setup infrastrutturale, RLS, configurazioni
> esterne) che non possono essere automatizzate via codice/migrations.
> Tracciate qui per onboarding e disaster recovery.

---

## Backup notturno (database + Storage)

**Riferimento**: audit prontezza 14/09/2026, punto #20.
**Dove sta**: tutto nel repo **privato** `irpinia-arte-danza/iad-portale-backup`.

- Workflow `.github/workflows/backup-nightly.yml`, ogni notte alle 01:37 UTC
  (03:37 ora legale, 02:37 ora solare).
- Script in `.github/scripts/backup/`.
- Secret del repository.
- I backup, come Release.

In `iad-portale` resta solo questa procedura: il backup non dipende dal codice
dell'applicazione.

> ### ⚠️ LA PASSPHRASE DEI BACKUP È IN 1PASSWORD DI FEDERICO. SE SI PERDE, TUTTI I BACKUP SONO INUTILIZZABILI.
>
> Non esiste recupero: i file sono cifrati (GPG, AES256) e senza passphrase non
> li apre nessuno, né noi né GitHub né Supabase.
>
> - Voce 1Password: **"IAD Portale — passphrase backup GPG"**.
> - La stessa passphrase è nel secret `BACKUP_GPG_PASSPHRASE` del repo di
>   backup, che però **non si può rileggere**: 1Password è l'unica copia leggibile.
> - Condividere la voce con una seconda persona di fiducia (vault condiviso):
>   se Federico non è raggiungibile, nessun altro può fare un restore.
> - Se si cambia passphrase, i backup già fatti restano cifrati con quella
>   vecchia: tenere in 1Password anche le passphrase precedenti, con la data
>   da cui vale la nuova, finché esistono backup cifrati con quelle (fino a 10 anni).
> - Controllare la copia in 1Password con la **prova di decifratura** (sotto)
>   subito dopo il setup e poi ogni 6 mesi.

### Contenuto di ogni backup

| File nella release | Contenuto | Cifrato |
|---|---|---|
| `db.dump.gpg` | `pg_dump` formato custom degli schemi `public` (tutti i dati del gestionale, `_prisma_migrations` compresa), `auth` (utenti, password in forma hash) e `storage` (metadati dei file) | sì |
| `storage-medical-certificates.tar.gpg` | tutti i file del bucket privato dei certificati medici | sì |
| `storage-brand.tar.gpg` | logo e allegati del brand | sì |
| `storage-<bucket>.tar.gpg` | ogni bucket creato in futuro, incluso in automatico | sì |
| `manifest.json` | data, versione Postgres, versione schema (ultima migrazione Prisma), righe per tabella, file e byte per bucket con configurazione, hash SHA-256 dei file in chiaro | no: nessun dato personale |
| `SHA256SUMS` | hash dei file così come sono caricati | no |

Prima di pubblicare, il workflow controlla. Se un controllo fallisce non carica
niente e manda l'email di avviso:

1. Postgres su Supabase ha la versione maggiore attesa (`PG_MAJOR` nel workflow).
   `pg_dump`/`pg_restore` girano nell'immagine ufficiale `postgres:<PG_MAJOR>`.
2. L'archivio si legge per intero: un file troncato fa fallire il passo.
3. Lo schema `public` viene ripristinato in un Postgres vuoto sul runner; i
   conteggi del manifest vengono da quella copia, quindi dimostrano che i dati
   sono dentro il backup.
4. Confronto con il backup pubblicato precedente. Il workflow si ferma se:
   - il dump del database è sotto il 70% del precedente;
   - le righe totali sono sotto l'80%;
   - una tabella importante (utenti, genitori, allieve, iscrizioni, pagamenti,
     ricevute, certificati, consensi, spese, compensi…) perde più del 20% e più
     di 5 righe, oppure si svuota;
   - una tabella o un bucket spariscono;
   - un bucket perde più del 20% dei file (almeno 3), oppure più del 30% dei byte;
   - le migrazioni applicate diminuiscono.

   Senza backup precedente, controlla solo che `users`, `athletes`,
   `brand_settings` e `_prisma_migrations` non siano vuote (secret che punta
   al database sbagliato).
5. Ogni file cifrato viene decifrato e confrontato con l'originale.
6. La release nasce in bozza. Si confrontano nomi e dimensioni dei file
   caricati; poi viene pubblicata, riscaricata e verificata con `SHA256SUMS`.

Note tecniche:

- **Connessione tramite Session pooler (porta 5432), non diretta.**
  `db.<ref>.supabase.co` risolve solo in IPv6 e i runner GitHub non escono in
  IPv6; l'add-on IPv4 di Supabase è a pagamento. `pg_dump` via Session pooler
  è il metodo indicato da Supabase per backup e migrazioni.
- I dati sono in chiaro solo sul runner GitHub, una VM usa e getta distrutta a
  fine job. Il workflow cancella comunque i file in chiaro.
- **Perché nel repo privato e non in `iad-portale`**, che è pubblico:
  - i log delle esecuzioni non sono pubblici;
  - GitHub disattiva i workflow schedulati dopo 60 giorni senza commit solo
    sui repo pubblici;
  - le release si scrivono con il `GITHUB_TOKEN` automatico, senza token
    personali.

  Il workflow comunque non stampa dati personali (solo totali e percentuali)
  e non carica artifact.
- Secret come **repository secrets**: sui repo privati gli environment con
  secret richiedono un piano GitHub a pagamento, e l'organizzazione è su Free.
- **Minuti Actions**: i repo privati dell'organizzazione hanno 2.000 minuti al
  mese. Il backup ne usa pochi a notte (stima 3–5, circa 150 al mese). A quota
  esaurita, senza metodo di pagamento, GitHub blocca i job **senza** email di
  errore: non aggiungere al repo di backup altri workflow pesanti.

### Cosa NON c'è nel backup

- Le modifiche fatte dopo l'ultimo backup: fino a circa 24 ore di lavoro.
- Configurazione di Supabase Auth: Site URL, Redirect URLs, SMTP Resend,
  template email della dashboard, rate limit.
- Sessioni attive, refresh token, link di invito o reset non ancora usati:
  dello schema `auth` si ripristinano solo `users` e `identities`.
- Chiavi API Supabase, password del database, JWT secret.
- Variabili d'ambiente Vercel, dominio e DNS, configurazione Resend (dominio,
  chiavi, webhook).
- Policy RLS dello Storage (oggi non applicate, vedi sezione dedicata) e
  configurazione dei bucket. Pubblico/privato, limiti e MIME sono nel
  manifest, per ricrearli.
- Schemi Supabase non usati dall'app (`vault` con 0 segreti, `realtime`,
  `extensions`): esistono già in ogni progetto nuovo.
- **I PDF delle ricevute come documenti.** Oggi vengono rigenerati a ogni
  apertura con logo, intestazione e footer *attuali*: il backup contiene i
  dati della ricevuta (numero, data, importi, pagante), non il PDF così come
  è stato emesso.
- Log di Vercel, Supabase e Resend. `email_logs` e `audit_logs` dell'app
  invece ci sono: sono tabelle.

### Retention

Applicata in automatico dopo ogni backup riuscito
(`.github/scripts/backup/retention.py` nel repo di backup):

| Livello | Cosa si tiene | Perché |
|---|---|---|
| Giornaliero | tutti i backup degli ultimi 14 giorni | Un errore (pagamento cancellato, iscrizione ritirata, modifica sovrascritta) di solito si nota entro pochi giorni; 14 coprono anche due settimane di assenza. |
| Settimanale | il primo backup di ogni settimana, per 8 settimane | Errori scoperti dopo settimane: sollecito contestato, controllo di fine mese, chiusura trimestrale. |
| Mensile | il primo backup di ogni mese, per 12 mesi | Ricostruire lo stato a una data qualsiasi dell'anno accademico. |
| Annuale | il primo backup di ogni anno (stato al 31/12), per 10 anni | Pagamenti e ricevute dell'anno fiscale chiuso. Scritture contabili e copie delle ricevute si conservano 10 anni (art. 2220 c.c.). Le ricevute del gestionale esistono solo come dati nel database. |

- Restano sempre almeno gli ultimi 7 backup. La retention gira solo dopo un
  backup pubblicato con successo: se il workflow fallisce per giorni, non
  cancella niente.
- **Minimizzazione dei certificati medici.** Dai backup tenuti solo come
  annuali (oltre i 12 mesi) viene tolto `storage-medical-certificates.tar.gpg`.
  Sono dati sanitari di minori, validi un anno, senza funzione fiscale; resta
  il database, con date e scadenze.
- **Spazio.** A regime circa 40 backup. Oggi un backup pesa circa 2 MB
  (database compresso 300 kB, Storage 1,5 MB); anche a 100 MB l'uno si resta
  sotto i 5 GB. GitHub non limita lo spazio totale delle release, solo i
  singoli file (2 GiB).
- **Da confermare.**
  - Con il commercialista: 10 anni è il termine prudente. Se basta meno, si
    cambia `YEARLY_YEARS` in `retention.py`.
  - Nell'informativa privacy va scritto che i dati restano nei backup cifrati
    fino a 10 anni.
- Una bozza rimasta da un'esecuzione interrotta viene cancellata dopo 24 ore.
  Le release senza tag `backup-AAAA-MM-GG-HHMM` non vengono mai toccate.

### Setup iniziale (una tantum)

Setup completato a settembre 2026: workflow verde, prima release pubblicata,
decifratura e `pg_restore --list` verificati in locale. I passi restano qui
per rifarlo su un repo nuovo o per ruotare chiavi e secret.

#### 1. Repo di backup

1. GitHub → organizzazione `irpinia-arte-danza` → **New repository**:
   - nome `iad-portale-backup`;
   - visibilità **Private**;
   - spuntare **Add a README**: le release richiedono almeno un commit.
2. Settings → General: disattivare Wiki, Issues, Discussions, Projects.
3. Collaboratori: nessuno oltre ai proprietari dell'organizzazione.

#### 2. Workflow e script nel repo

Il repo di backup contiene:

- `README.md`;
- `.github/workflows/backup-nightly.yml`;
- `.github/scripts/backup/storage.py`, `manifest.py`, `retention.py`.

Questi file esistono **solo** nel repo di backup: in `iad-portale` non c'è
nessuna copia. Per modificarli si lavora su un clone del repo di backup; per
ricreare il repo da zero si copiano da un clone esistente.

```bash
cd ~/Documents/Progetti
gh repo clone irpinia-arte-danza/iad-portale-backup
cd iad-portale-backup
# modifiche a .github/workflows o .github/scripts/backup
git add -A && git commit -m "chore: …" && git push
```

- I commit sul workflow li fa Federico: le email di GitHub sui workflow
  schedulati falliti vanno a chi ha modificato per ultimo la riga `cron`.
- Secret (passo 6) e prima prova (passo 7) nello stesso giorno: senza secret,
  l'esecuzione delle 01:37 UTC fallisce.
- Dopo ogni modifica a workflow o script: Run workflow a mano e controllare
  che finisca in verde.

#### 3. Passphrase

1. 1Password → nuovo elemento Password → generatore con **48 caratteri, lettere e
   numeri** (senza simboli, si incolla senza problemi in terminale).
2. Titolo **"IAD Portale — passphrase backup GPG"**. Nelle note: data di
   creazione e "secret `BACKUP_GPG_PASSPHRASE` del repo iad-portale-backup".
3. Condividere l'elemento con la seconda persona di fiducia.

#### 4. Chiave Supabase dedicata

Supabase Dashboard → progetto → Settings → **API Keys** → Secret keys →
**New secret key**, nome `github-backup`. Chiave separata da quella di Vercel:
si revoca senza toccare l'app.

#### 5. Chiave Resend dedicata

Resend → API Keys → **Create API Key**:

- nome `iad-portale-backup-alert`;
- permission **Sending access**;
- domain `irpiniaartedanza.it`.

#### 6. Secret del repo di backup

Repo `iad-portale-backup` → Settings → **Secrets and variables** → **Actions** →
*New repository secret*, uno per riga:

| Secret | Valore | Da dove |
|---|---|---|
| `BACKUP_DATABASE_URL` | Connection string **Session pooler**, porta 5432, con `?sslmode=require` in fondo | Supabase → **Connect** → *Session pooler*. È il valore di `DIRECT_URL` in `.env.local`/Vercel **senza le virgolette** che in `.env.local` lo racchiudono, più `?sslmode=require`. Con le virgolette il dump fallisce con `local user with ID 1001 does not exist`; il workflow ora lo segnala già in *Verifica configurazione*. Formato `postgresql://postgres.<ref>:<password>@<host-pooler>:5432/postgres?sslmode=require`; eventuali caratteri speciali della password vanno codificati come nell'URL di Prisma. **Non** usare `DATABASE_URL` (porta 6543 con `pgbouncer=true`) né `db.<ref>.supabase.co`: il workflow li rifiuta. |
| `BACKUP_SUPABASE_URL` | `https://<ref>.supabase.co` | Stesso valore di `NEXT_PUBLIC_SUPABASE_URL`. |
| `BACKUP_SUPABASE_SECRET_KEY` | chiave `sb_secret_…` | Passo 4. |
| `BACKUP_GPG_PASSPHRASE` | la passphrase (minimo 32 caratteri) | Passo 3, copiata da 1Password. |
| `BACKUP_RESEND_API_KEY` | chiave `re_…` | Passo 5. |
| `BACKUP_ALERT_EMAIL` | indirizzo che riceve gli avvisi | Quello di Federico. |

Nessun token personale: il workflow scrive le release nel proprio repo con il
`GITHUB_TOKEN` automatico, a cui chiede `contents: write`. Se al primo test la
pubblicazione fallisce con `Resource not accessible by integration`, un owner
dell'organizzazione deve consentire la scrittura in Settings → Actions →
General → *Workflow permissions*.

Poi, sul profilo GitHub di Federico → Settings → Notifications → **Actions**:
attivare le email per i workflow falliti. È il secondo canale di avviso,
oltre a Resend.

#### 7. Primo test, senza aspettare la notte

1. Repo `iad-portale-backup` → **Actions** → *Backup notturno* → **Run workflow** → Run.
   Da terminale:
   `gh workflow run backup-nightly.yml --repo irpinia-arte-danza/iad-portale-backup`,
   poi `gh run watch --repo irpinia-arte-danza/iad-portale-backup`.
2. Esito atteso, in 3–5 minuti:
   - job verde;
   - nel repo di backup una release `backup-AAAA-MM-GG-HHMM` con
     `db.dump.gpg`, `storage-brand.tar.gpg`,
     `storage-medical-certificates.tar.gpg`, `manifest.json` e `SHA256SUMS`;
   - riepilogo del job con righe e file.
3. Rilanciare una seconda volta. Nel passo *Manifest e controlli* deve comparire
   "Confronto con backup-…".
4. Test dell'email di avviso: rilanciare e premere **Cancel run** durante il
   passo *Dump del database*. Deve arrivare "Backup IAD NON riuscito" a
   `BACKUP_ALERT_EMAIL`, e nel repo di backup non deve comparire nessuna
   release nuova.
5. Fare la **prova di decifratura** (sotto) con la passphrase presa da 1Password.

### Quando arriva l'email di errore

Workflow e secret stanno nel repo `iad-portale-backup`. Gli avvisi arrivano da
Resend (a `BACKUP_ALERT_EMAIL`) e da GitHub (a chi ha committato il workflow).
Aprire il link nell'email: il passo fallito è in rosso, con il messaggio.

| Passo fallito / messaggio | Causa | Cosa fare |
|---|---|---|
| *Verifica configurazione* | Secret mancante o nel formato sbagliato | Il messaggio dice quale: correggerlo nei secret del repo di backup e rilanciare. |
| *Dump del database* — "Supabase usa Postgres N" | Supabase aggiornato a una nuova versione maggiore | Cambiare `PG_MAJOR` in `.github/workflows/backup-nightly.yml` del repo di backup, push, rilanciare. |
| *Dump del database* — `password authentication failed` | Password del database cambiata | Aggiornare `BACKUP_DATABASE_URL` (e le variabili su Vercel). |
| *Download di Supabase Storage* — HTTP 401/403 | Chiave `github-backup` revocata | Nuova secret key (passo 4). |
| *Manifest e controlli* — **"Backup sospetto"** | Dati molto diminuiti rispetto al backup precedente | **Non rilanciare subito.** Capire se la riduzione è voluta: eliminazioni definitive dal cestino, corso eliminato, pulizia di fine anno. Se **non** è voluta, l'ultimo backup buono è il precedente: vedi *Recuperare dati cancellati*. Se è voluta, Run workflow con **allow_shrink** spuntato. Finché non si fa, ogni notte il backup si ferma allo stesso controllo. |
| *Manifest*, *Pubblicazione* o *Retention* — `Resource not accessible by integration` o `403` | Il `GITHUB_TOKEN` non può scrivere le release | Settings → Actions → General → *Workflow permissions* del repo di backup; se l'impostazione è bloccata, la sblocca un owner dell'organizzazione. |
| *Email di avviso* fallita | Chiave Resend revocata | Nuova chiave (passo 5) in `BACKUP_RESEND_API_KEY`; nel frattempo resta l'email di GitHub. |
| Job annullato o in timeout | GitHub o Supabase lenti | Rilanciare a mano. |

**Casi che nessuna email segnala.** Se il workflow non parte proprio, non può
avvisare:

- workflow disattivato a mano (Actions → *Backup notturno* → *Enable workflow*);
- Actions disattivate per il repo o per l'organizzazione;
- minuti Actions esauriti;
- errore di sintassi introdotto modificando il workflow: GitHub lo mostra solo
  nella pagina Actions.

Per coprirli: dopo ogni modifica, lanciare il workflow a mano; una volta al
mese aprire le Releases del repo di backup e controllare che l'ultimo backup
sia di stanotte.

### Prova di decifratura (dopo il setup, poi ogni 6 mesi)

Serve a verificare che la passphrase in 1Password apra davvero i backup.

```bash
brew install gnupg postgresql@17
mkdir -p ~/iad-restore && cd ~/iad-restore
gh release download --repo irpinia-arte-danza/iad-portale-backup --pattern '*'   # ultimo backup
shasum -a 256 -c SHA256SUMS
gpg --pinentry-mode loopback --decrypt --output db.dump db.dump.gpg     # incollare la passphrase da 1Password
shasum -a 256 db.dump        # deve coincidere con database.plain_sha256 in manifest.json
/opt/homebrew/opt/postgresql@17/bin/pg_restore --list db.dump | head -5
cd ~ && rm -rf ~/iad-restore     # contiene dati di minori in chiaro: cancellare subito
```

### Recuperare dati cancellati o sovrascritti (restore parziale)

Per un pagamento cancellato, un'iscrizione ritirata, una modifica sovrascritta
o un corso eliminato definitivamente (con iscrizioni, orari, lezioni e presenze
a cascata). Il cestino dell'app non copre questi casi.

1. Scegliere l'ultimo backup **precedente** all'errore. Il tag riporta data e
   ora UTC; nel repo di backup → Releases.
2. Scaricare e decifrare, indicando il tag:
   ```bash
   mkdir -p ~/iad-restore && cd ~/iad-restore
   gh release download backup-AAAA-MM-GG-HHMM --repo irpinia-arte-danza/iad-portale-backup --pattern 'db.dump.gpg' --pattern 'manifest.json'
   gpg --pinentry-mode loopback --decrypt --output db.dump db.dump.gpg
   ```
3. Postgres locale usa e getta, con lo stesso restore verificato ogni notte dal workflow:
   ```bash
   export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"
   initdb -D ~/iad-restore/pg -U postgres --auth=trust
   pg_ctl -D ~/iad-restore/pg -o "-p 5499 -c listen_addresses=127.0.0.1" -l ~/iad-restore/pg.log start
   createdb -h 127.0.0.1 -p 5499 -U postgres iad
   pg_restore -h 127.0.0.1 -p 5499 -U postgres -d iad --schema=public --no-owner --no-privileges --exit-on-error db.dump
   psql -h 127.0.0.1 -p 5499 -U postgres iad
   ```
4. Cercare le righe perse (es. `select * from payments where athlete_id = '…'`)
   e confrontarle con la produzione.
5. Reinserire in produzione:
   - **Poche righe**: dall'app. Passano dalle validazioni e finiscono
     nell'audit log.
   - **Molte righe** (es. corso eliminato con iscrizioni e presenze): `insert`
     SQL preparati sulle righe del restore, fatti rivedere, eseguiti nel SQL
     editor di Supabase dopo un backup manuale (Run workflow).
   - **Ricevute**: non reinserire numeri già riassegnati; la numerazione non
     deve avere doppioni.
6. Pulizia: `pg_ctl -D ~/iad-restore/pg stop && cd ~ && rm -rf ~/iad-restore`.

### Restore completo su un nuovo progetto Supabase (disaster recovery)

Quando il progetto Supabase è perso, cancellato o inutilizzabile.

**Tempo stimato: 1 h 40 – 2 h la prima volta**

| Fase | Tempo |
|---|---|
| A. Scaricare e decifrare | 10 min |
| B. Creare il progetto Supabase | 10 min |
| C + D. Utenti Auth, database, verifica conteggi | 15 min |
| E. Bucket e file | 15 min |
| F. Configurazione Auth, Vercel, redeploy | 30–45 min |
| G. Verifiche funzionali | 20 min |

Servono: passphrase (1Password), accesso a GitHub org, Supabase, Vercel,
Resend; Mac con `gnupg`, `postgresql@17` e `gh`.

**Da annotare adesso, a progetto sano** (non sono nel backup). In 1Password,
voce "IAD Portale — configurazione Supabase Auth":

- Site URL e Redirect URLs (Authentication → URL Configuration);
- impostazioni SMTP custom (Authentication → Emails → SMTP);
- eventuali template email Auth personalizzati.

#### A. Scaricare e decifrare

```bash
mkdir -p ~/iad-restore && cd ~/iad-restore
export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"
gh release download backup-AAAA-MM-GG-HHMM --repo irpinia-arte-danza/iad-portale-backup
shasum -a 256 -c SHA256SUMS
for f in *.gpg; do gpg --pinentry-mode loopback --decrypt --output "${f%.gpg}" "$f"; done
python3 - <<'PY'
import hashlib, json
m = json.load(open("manifest.json"))
files = [("db.dump", m["database"]["plain_sha256"])]
files += [(b["file"].removesuffix(".gpg"), b["plain_sha256"]) for b in m["storage"]["buckets"]]
for name, expected in files:
    ok = hashlib.sha256(open(name, "rb").read()).hexdigest() == expected
    print("OK " if ok else "ERRORE", name)
print("Postgres di origine:", m["database"]["server_version"], "| utenti Auth:", m["database"]["auth_users"])
PY
```

#### B. Nuovo progetto Supabase

1. Supabase → New project:
   - organizzazione IAD;
   - region **West EU (Ireland)**;
   - Postgres della **stessa versione maggiore** di `server_version` nel manifest;
   - password del database generata e salvata in 1Password.

   Il piano Free permette 2 progetti attivi.
2. Quando il progetto è pronto: **Connect** → *Session pooler* → copiare l'URI.
   ```bash
   export NEW_DB='postgresql://postgres.<nuovo-ref>:<password>@<host-pooler>:5432/postgres?sslmode=require'
   ```

#### C. Utenti Auth (password comprese)

```bash
pg_restore --dbname="$NEW_DB" --data-only --schema=auth --table=users --no-owner --exit-on-error db.dump
pg_restore --dbname="$NEW_DB" --data-only --schema=auth --table=identities --no-owner --exit-on-error db.dump
psql "$NEW_DB" -XAt -c "select count(*) from auth.users"    # = auth_users nel manifest
```

Gli id degli utenti devono restare identici a quelli in `public.users`. Se uno
dei due comandi fallisce (es. colonna diversa in una versione nuova di Supabase
Auth), **fermarsi**: non creare utenti a mano né reinvitarli, altrimenti gli id
non coincidono più con `public.users`.

#### D. Database del gestionale

```bash
pg_restore --dbname="$NEW_DB" --schema=public --no-owner --no-privileges --exit-on-error db.dump
psql "$NEW_DB" -XAt > counts-new.json <<'SQL'
select json_object_agg(table_name, (xpath('/row/c/text()',
  query_to_xml(format('select count(*) as c from public.%I', table_name), false, true, '')))[1]::text::bigint)
from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'
SQL
python3 -c 'import json; m=json.load(open("manifest.json"))["database"]["public_tables"]; n=json.load(open("counts-new.json")); d={k:(m[k],n.get(k)) for k in m if m[k]!=n.get(k)}; print("Conteggi identici al manifest" if not d else d)'
```

Sono le stesse opzioni del restore di prova notturno. I permessi per `anon`,
`authenticated` e `service_role` li assegna Supabase in automatico alle tabelle
create da `postgres`. `_prisma_migrations` è inclusa: `prisma migrate status`
risulterà allineato.

#### E. Bucket e file

1. Creare i bucket con la configurazione del manifest:
   ```bash
   python3 - <<'PY' > buckets.sql
   import json
   for b in json.load(open("manifest.json"))["storage"]["buckets"]:
       mimes = "null" if not b["allowed_mime_types"] else "array[" + ",".join(f"'{t}'" for t in b["allowed_mime_types"]) + "]"
       limit = "null" if b["file_size_limit"] is None else b["file_size_limit"]
       print(f"insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) "
             f"values ('{b['id']}', '{b['id']}', {str(b['public']).lower()}, {limit}, {mimes});")
   PY
   psql "$NEW_DB" -v ON_ERROR_STOP=1 -f buckets.sql
   ```
2. Caricare i file con una secret key del **nuovo** progetto (Settings → API Keys):
   ```bash
   export NEW_URL='https://<nuovo-ref>.supabase.co'
   export NEW_KEY='sb_secret_…'
   for archive in storage-*.tar; do
     bucket=${archive#storage-}; bucket=${bucket%.tar}
     mkdir -p "files/$bucket" && tar -xf "$archive" -C "files/$bucket"
     (cd "files/$bucket" && find . -type f | sed 's|^\./||' | while read -r path; do
       curl -fsS -o /dev/null -X POST "$NEW_URL/storage/v1/object/$bucket/$path" \
         -H "apikey: $NEW_KEY" -H "Content-Type: $(file --brief --mime-type "$path")" \
         --data-binary "@$path" && echo "ok $bucket"
     done)
   done
   psql "$NEW_DB" -XAt -c "select bucket_id, count(*) from storage.objects group by 1"   # = objects per bucket nel manifest
   ```
3. Aggiornare gli URL del brand, che contengono il ref del vecchio progetto
   (quello in `NEXT_PUBLIC_SUPABASE_URL`):
   ```sql
   update brand_settings set
     logo_url      = replace(logo_url,      '<vecchio-ref>.supabase.co', '<nuovo-ref>.supabase.co'),
     logo_dark_url = replace(logo_dark_url, '<vecchio-ref>.supabase.co', '<nuovo-ref>.supabase.co'),
     logo_svg_url  = replace(logo_svg_url,  '<vecchio-ref>.supabase.co', '<nuovo-ref>.supabase.co'),
     favicon_url   = replace(favicon_url,   '<vecchio-ref>.supabase.co', '<nuovo-ref>.supabase.co');
   ```
   I certificati non vanno toccati: il file si ritrova da `file_path` e il link
   firmato (`file_url`) viene rigenerato dall'app.

#### F. Configurazione

1. **Supabase Auth**: Site URL, Redirect URLs e SMTP custom Resend, con i
   valori annotati in 1Password.
2. **Vercel** → Settings → Environment Variables (Production), valori del
   nuovo progetto:
   - `DATABASE_URL`: Transaction pooler 6543 con `?pgbouncer=true`, come oggi;
   - `DIRECT_URL`: Session pooler 5432;
   - `NEXT_PUBLIC_SUPABASE_URL`;
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: publishable key;
   - `SUPABASE_SERVICE_ROLE_KEY`: una secret key dedicata a Vercel.

   Poi **Redeploy** della produzione.
3. `.env.local` di chi sviluppa: stessi valori.
4. **Secret del repo di backup**: aggiornare `BACKUP_DATABASE_URL`,
   `BACKUP_SUPABASE_URL` e `BACKUP_SUPABASE_SECRET_KEY` (nuova chiave
   `github-backup`). Poi Run workflow per avere subito un backup del nuovo progetto.

#### G. Verifiche

- `npx dotenv -e .env.local -- npx prisma migrate status` → *Database schema is up to date*.
- Login come admin con la password di sempre. Tutti gli utenti devono rifare
  il login.
- Allieve, pagamenti, scadenze: numeri coerenti con il manifest.
- Aprire una ricevuta: il PDF si genera e il logo è visibile (URL brand aggiornati).
- Aprire un certificato medico dalla scheda allieva.
- Recupero password su un proprio account: l'email arriva.
- Avvisare Giuseppina: i dati sono quelli di data e ora del backup, e quanto
  inserito dopo va reinserito.

### Prova di restore periodica

- **Ogni 6 mesi** (gennaio e luglio): prova di decifratura e restore parziale
  locale. Controllare che i conteggi coincidano con il manifest.
- **Una volta l'anno**: restore completo su un progetto Supabase temporaneo
  (fasi A–E), poi eliminare il progetto. È l'unico modo per verificare davvero
  le fasi C ed E.

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
