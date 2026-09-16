-- Template dell'email con la ricevuta in allegato.
-- Idempotente: ON CONFLICT DO NOTHING — non sovrascrive se l'admin ha già
-- personalizzato subject/body da /admin/email-templates.
--
-- Il condizionale sulla detrazione è voluto: la detraibilità vale solo con
-- pagamento tracciabile e per i 5-18 anni, e la ricevuta allegata riporta la
-- dicitura solo in quei casi. L'email non deve contraddire l'allegato.

INSERT INTO email_templates (
  id, slug, name, description, subject, body_html, body_text,
  category, is_active, created_at, updated_at
)
VALUES (
  'cl1c0ricevutaemessa000001',
  'ricevuta-emessa',
  'Ricevuta emessa',
  'Email con la ricevuta in allegato, inviata al pagante congelato sulla ricevuta',
  'Ricevuta n. {numero_ricevuta} — {allieva_nome}',
  '<p>Gentile {genitore_nome},</p>
<p>in allegato la ricevuta <strong>n. {numero_ricevuta}</strong> del {data_ricevuta}, intestata a lei per {allieva_nome}.</p>
<p>Importo: <strong>{importo}</strong></p>
<p>La conservi: potrebbe servirle per la dichiarazione dei redditi.</p>
<p>Per qualsiasi chiarimento ci scriva a <a href="mailto:info@irpiniaartedanza.it">info@irpiniaartedanza.it</a> o ci chiami al 320 82 68 353.</p>
<hr>
<p><small>A.S.D. IAD Irpinia Arte Danza</small></p>',
  'Gentile {genitore_nome},

in allegato la ricevuta n. {numero_ricevuta} del {data_ricevuta}, intestata a lei per {allieva_nome}.

Importo: {importo}

La conservi: potrebbe servirle per la dichiarazione dei redditi.

Per qualsiasi chiarimento ci scriva a info@irpiniaartedanza.it o ci chiami al 320 82 68 353.

A.S.D. IAD Irpinia Arte Danza',
  'CONFERMA',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;
