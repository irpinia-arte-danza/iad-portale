-- Sprint onboarding: template email per accesso area riservata e recupero
-- password. Idempotente: ON CONFLICT DO NOTHING — non sovrascrive se admin
-- ha già personalizzato subject/body via /admin/email-templates.
-- Il contenuto è identico ai default in src/lib/auth/access-emails.ts
-- (usati se il template manca, è disattivato o non contiene più il link).

INSERT INTO email_templates (
  id, slug, name, description, subject, body_html, body_text,
  category, is_active, created_at, updated_at
)
VALUES (
  'cl1c0accessoportale0000001',
  'accesso-portale',
  'Accesso area riservata',
  'Invito a genitori e insegnanti ad attivare l''accesso scegliendo la password (link personale)',
  'Il tuo accesso all''{area_nome} — {asd_nome}',
  '<p>Gentile {destinatario_nome},</p>
<p>è pronto il tuo accesso all''<strong>{area_nome}</strong> di {asd_nome}, dove potrai {descrizione_area}.</p>
<p>Per attivarlo clicca sul pulsante qui sotto e scegli la tua password:</p>
<p><a href="{link_accesso}" style="display:inline-block;padding:12px 20px;background-color:#171717;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600">Attiva il mio accesso</a></p>
<p>Il link è personale e resta valido per un tempo limitato. Se non funziona più, apri <a href="{link_recupero}">{link_recupero}</a> e inserisci questo indirizzo email: ne riceverai uno nuovo.</p>
<p>Per informazioni: <a href="mailto:{asd_email}">{asd_email}</a></p>
<hr>
<p><small>{asd_nome}</small></p>',
  'Gentile {destinatario_nome},
è pronto il tuo accesso all''{area_nome} di {asd_nome}, dove potrai {descrizione_area}.
Per attivarlo apri questo link e scegli la tua password:
{link_accesso}
Il link è personale e resta valido per un tempo limitato. Se non funziona più, apri {link_recupero} e inserisci questo indirizzo email: ne riceverai uno nuovo.
Per informazioni: {asd_email}
{asd_nome}',
  'BENVENUTO',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO email_templates (
  id, slug, name, description, subject, body_html, body_text,
  category, is_active, created_at, updated_at
)
VALUES (
  'cl1c0recuperopassword00001',
  'recupero-password',
  'Recupero password',
  'Link per scegliere una nuova password, inviato quando si usa «Password dimenticata»',
  'Imposta una nuova password — {asd_nome}',
  '<p>Gentile {destinatario_nome},</p>
<p>abbiamo ricevuto una richiesta per impostare una nuova password per il tuo accesso all''area riservata di {asd_nome}.</p>
<p><a href="{link_accesso}" style="display:inline-block;padding:12px 20px;background-color:#171717;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600">Scegli una nuova password</a></p>
<p>Il link è personale e resta valido per un tempo limitato. Se è scaduto puoi richiederne un altro da <a href="{link_recupero}">{link_recupero}</a>.</p>
<p>Se non hai fatto tu questa richiesta puoi ignorare questa email: la password attuale resta valida.</p>
<hr>
<p><small>{asd_nome} · <a href="mailto:{asd_email}">{asd_email}</a></small></p>',
  'Gentile {destinatario_nome},
abbiamo ricevuto una richiesta per impostare una nuova password per il tuo accesso all''area riservata di {asd_nome}.
Scegli una nuova password da questo link:
{link_accesso}
Il link è personale e resta valido per un tempo limitato. Se è scaduto puoi richiederne un altro da {link_recupero}.
Se non hai fatto tu questa richiesta puoi ignorare questa email: la password attuale resta valida.
{asd_nome} · {asd_email}',
  'COMUNICAZIONE',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;
