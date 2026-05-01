-- Fase 1.C: seed default email template MEDICAL_CERTIFICATE_REMINDER
-- Idempotente: ON CONFLICT DO NOTHING — non sovrascrive se admin ha
-- già personalizzato subject/body via /admin/email-templates.

INSERT INTO email_templates (
  id, slug, name, description, subject, body_html, body_text,
  category, is_active, created_at, updated_at
)
VALUES (
  -- cuid stabile generato a mano (lunghezza 25, prefisso 'c' come cuid spec)
  'cl1c0certremnd00000000001',
  'cert-reminder',
  'Promemoria certificato medico',
  'Avviso al genitore quando il certificato medico è in scadenza o scaduto',
  'Certificato medico {tipo_certificato} di {allieva_nome} — scadenza {data_scadenza}',
  '<p>Gentile {genitore_nome},</p>
<p>le ricordiamo che il certificato medico <strong>{tipo_certificato}</strong> di <strong>{allieva_nome}</strong> scade il <strong>{data_scadenza}</strong> ({giorni_scadenza} giorni).</p>
<p>Per consentire la prosecuzione delle attività in palestra, le chiediamo di provvedere al rinnovo prima della scadenza.</p>
<p>Una volta effettuata la visita medica, può consegnare il nuovo certificato in segreteria oppure inviarlo via email a <a href="mailto:info@irpiniaartedanza.it">info@irpiniaartedanza.it</a>.</p>
<p>Grazie per la collaborazione.</p>
<hr>
<p><small>A.S.D. IAD Irpinia Arte Danza</small></p>',
  'Gentile {genitore_nome},
il certificato medico {tipo_certificato} di {allieva_nome} scade il {data_scadenza} ({giorni_scadenza} giorni).
Per la prosecuzione delle attività, è necessario il rinnovo prima della scadenza.
Consegna in segreteria o via email a info@irpiniaartedanza.it.
A.S.D. IAD Irpinia Arte Danza',
  'PROMEMORIA',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;
