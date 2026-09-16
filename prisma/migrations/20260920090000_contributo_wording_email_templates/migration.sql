-- Wording per le famiglie: "quota" → "contributo" nei template email.
-- "Contributo" è il termine corretto per una ASD ed è quello che le famiglie
-- leggono su ricevute e comunicazioni (vedi FEE_TYPE_LABELS e
-- association-fee-label.ts). I nomi delle variabili ({tipo_quota},
-- {stage_quota}) NON cambiano: sono riferimenti tecnici usati dai template
-- salvati e rinominarli romperebbe le personalizzazioni dell'admin.
--
-- Idempotente: ogni UPDATE sostituisce una frase esatta e tocca solo le righe
-- che la contengono ancora. Rieseguirlo non cambia nulla. Se l'admin ha
-- personalizzato il testo da /admin/email-templates, la personalizzazione
-- resta: cambia solo la frase, se è ancora quella originale.

-- Sollecito scadenza
UPDATE email_templates
SET subject = REPLACE(
      subject,
      'Promemoria: quota {mese}',
      'Promemoria: contributo di {mese}'
    ),
    updated_at = NOW()
WHERE slug = 'sollecito-scadenza'
  AND subject LIKE '%Promemoria: quota {mese}%';

UPDATE email_templates
SET body_html = REPLACE(
      body_html,
      'le ricordiamo che la quota di <strong>{mese}</strong>',
      'le ricordiamo che il contributo di <strong>{mese}</strong>'
    ),
    updated_at = NOW()
WHERE slug = 'sollecito-scadenza'
  AND body_html LIKE '%le ricordiamo che la quota di <strong>{mese}</strong>%';

UPDATE email_templates
SET body_text = REPLACE(
      body_text,
      'la quota di {mese} per {allieva_nome} è da saldare.',
      'il contributo di {mese} per {allieva_nome} è da saldare.'
    ),
    updated_at = NOW()
WHERE slug = 'sollecito-scadenza'
  AND body_text LIKE '%la quota di {mese} per {allieva_nome} è da saldare.%';

-- Descrizione mostrata nell'elenco template in /admin/email-templates
UPDATE email_templates
SET description = 'Email per contributi scaduti non pagati',
    updated_at = NOW()
WHERE slug = 'sollecito-scadenza'
  AND description = 'Email per quote scadute non pagate';

-- Promemoria scadenza in arrivo
UPDATE email_templates
SET subject = REPLACE(
      subject,
      'Scadenza in arrivo - quota {mese}',
      'Scadenza in arrivo - contributo di {mese}'
    ),
    updated_at = NOW()
WHERE slug = 'promemoria-scadenza'
  AND subject LIKE '%Scadenza in arrivo - quota {mese}%';

UPDATE email_templates
SET body_html = REPLACE(
      body_html,
      'la quota di {mese} per {allieva_nome} scade il',
      'il contributo di {mese} per {allieva_nome} scade il'
    ),
    updated_at = NOW()
WHERE slug = 'promemoria-scadenza'
  AND body_html LIKE '%la quota di {mese} per {allieva_nome} scade il%';

-- Conferma pagamento: la riga riporta la causale della ricevuta
UPDATE email_templates
SET body_html = REPLACE(
      body_html,
      '<li>Tipo: {tipo_quota}</li>',
      '<li>Causale: {tipo_quota}</li>'
    ),
    updated_at = NOW()
WHERE slug = 'conferma-pagamento'
  AND body_html LIKE '%<li>Tipo: {tipo_quota}</li>%';

-- Invito stage
UPDATE email_templates
SET body_html = REPLACE(
      body_html,
      '<strong>Quota di partecipazione</strong>',
      '<strong>Contributo di partecipazione</strong>'
    ),
    updated_at = NOW()
WHERE slug = 'stage-invite'
  AND body_html LIKE '%<strong>Quota di partecipazione</strong>%';

UPDATE email_templates
SET body_text = REPLACE(
      body_text,
      'Quota: {stage_quota}',
      'Contributo: {stage_quota}'
    ),
    updated_at = NOW()
WHERE slug = 'stage-invite'
  AND body_text LIKE '%Quota: {stage_quota}%';
