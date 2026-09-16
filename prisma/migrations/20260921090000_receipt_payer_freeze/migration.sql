-- Destinatario congelato sulla ricevuta: id ed email del pagante, accanto a
-- nome, codice fiscale e indirizzo che erano già congelati.
--
-- Senza questi campi un "Invia di nuovo" a distanza di mesi userebbe il
-- pagante ricavato in quel momento dal pagamento, che nel frattempo può
-- essere cambiato: con genitori separati significherebbe mandare a uno i
-- dati fiscali dell'altro. Il documento deve sapere da sé a chi è destinato.

ALTER TABLE "receipts" ADD COLUMN "payer_id" UUID;
ALTER TABLE "receipts" ADD COLUMN "payer_email" TEXT;

-- Recupero delle ricevute già emesse.
--
-- Si recupera SOLO dove il pagamento indica un genitore preciso e il suo nome
-- coincide con quello congelato sulla ricevuta: il nome è l'unica prova di chi
-- fosse il pagante all'emissione. Dove non coincide, o dove il pagante era
-- l'allieva stessa, la ricevuta resta senza destinatario e l'invio per email
-- la blocca con il motivo, invece di indovinare un indirizzo.
--
-- Idempotente: la guardia payer_id IS NULL rende innocua una riesecuzione.
UPDATE "receipts" r
SET "payer_id" = par.id,
    "payer_email" = par.email
FROM "payments" p
JOIN "parents" par ON par.id = p.parent_id
WHERE r.payment_id = p.id
  AND r.payer_id IS NULL
  AND r.payer_name IS NOT NULL
  AND btrim(concat(par.first_name, ' ', par.last_name)) = btrim(r.payer_name);
