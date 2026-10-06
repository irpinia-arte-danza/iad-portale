-- Testo dell'email "certificato mancante": la richiesta alla famiglia quando
-- per l'allieva non c'è nessun certificato medico. Il testo esistente
-- (cert-reminder) parla di una scadenza, che qui non esiste.
--
-- Additiva e idempotente: ON CONFLICT DO NOTHING. Se il testo c'è già — e
-- magari Giuseppina l'ha modificato da "Testi delle email" — non si tocca.
-- Nessuna modifica allo schema.

INSERT INTO email_templates (
  id, slug, name, description, subject, body_html, body_text,
  category, is_active, created_at, updated_at
)
VALUES (
  'cl1c0certmancante00000001',
  'certificato-mancante',
  'Certificato medico mancante',
  'Richiesta alla famiglia quando per l''allieva non c''è nessun certificato medico',
  'Certificato medico di {allieva_nome}',
  '<p>Gentile {genitore_nome},</p>
<p>per <strong>{allieva_nome}</strong> non abbiamo ancora il certificato medico.</p>
<p>Senza certificato non può fare lezione: può portarlo in sala o inviarcelo.</p>
<p>Grazie,<br>IAD Irpinia Arte Danza</p>',
  'Gentile {genitore_nome}, per {allieva_nome} non abbiamo ancora il certificato medico. Senza certificato non può fare lezione: può portarlo in sala o inviarcelo. Grazie, IAD Irpinia Arte Danza',
  'PROMEMORIA',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;
