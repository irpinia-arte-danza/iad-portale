-- Sprint 6.A: seed default email template STAGE_INVITE
-- Idempotente: ON CONFLICT DO NOTHING — non sovrascrive se admin
-- ha già personalizzato subject/body via /admin/email-templates.

INSERT INTO email_templates (
  id, slug, name, description, subject, body_html, body_text,
  category, is_active, created_at, updated_at
)
VALUES (
  'cl1c0stageinvite0000000001',
  'stage-invite',
  'Invito iscrizione stage',
  'Invito alle famiglie a iscriversi a uno stage workshop',
  'Stage {stage_titolo} — {stage_data} — iscrizioni aperte',
  '<p>Gentile {genitore_nome},</p>
<p>siamo felici di invitare <strong>{allieva_nome}</strong> allo stage <strong>{stage_titolo}</strong>.</p>
<ul>
  <li><strong>Quando</strong>: {stage_data} dalle {stage_orario_inizio}</li>
  <li><strong>Dove</strong>: {stage_luogo}</li>
  <li><strong>Quota di partecipazione</strong>: {stage_quota}</li>
  <li><strong>Scadenza iscrizioni</strong>: {stage_scadenza}</li>
</ul>
<p>Per iscrivere {allieva_nome}, accedi all''area genitori: <a href="{stage_link}">{stage_link}</a></p>
<p>Per informazioni: <a href="mailto:info@irpiniaartedanza.it">info@irpiniaartedanza.it</a></p>
<hr>
<p><small>A.S.D. IAD Irpinia Arte Danza</small></p>',
  'Gentile {genitore_nome},
siamo felici di invitare {allieva_nome} allo stage {stage_titolo}.
Quando: {stage_data} dalle {stage_orario_inizio}
Dove: {stage_luogo}
Quota: {stage_quota}
Scadenza iscrizioni: {stage_scadenza}
Iscrizioni: {stage_link}
Info: info@irpiniaartedanza.it
A.S.D. IAD Irpinia Arte Danza',
  'COMUNICAZIONE',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;
