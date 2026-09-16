-- Residenza dell'allieva congelata sulla ricevuta.
--
-- La ricevuta riporta ora nome, codice fiscale e residenza dell'allieva: come
-- per il pagante, quei dati devono restare quelli del giorno dell'emissione e
-- non seguire le modifiche successive all'anagrafica.
--
-- Data e luogo di nascita NON si congelano: non compaiono sul documento, e
-- duplicarli qui sarebbe dato personale di minori conservato senza scopo.
-- Restano sull'anagrafica dell'allieva, che è il loro posto.
--
-- Nessun recupero sulle ricevute già emesse: restano NULL. Il loro PDF è
-- archiviato e non viene mai rigenerato, quindi riempire la colonna direbbe
-- una cosa diversa dal documento consegnato.

ALTER TABLE "receipts" ADD COLUMN "athlete_address" TEXT;
