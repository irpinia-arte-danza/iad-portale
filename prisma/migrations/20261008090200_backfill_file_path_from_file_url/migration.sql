-- GDPR tecnico (#49): il download di certificati e tessere legge solo
-- file_path; file_url (il vecchio link firmato a 24 ore) non si scrive e non
-- si legge più.
--
-- Dal codice, file_path è stato scritto a ogni caricamento fin dal primo
-- giorno (fase 1.B per i certificati, #23 per le tessere), quindi questa
-- migration non dovrebbe toccare nessuna riga. È una rete di sicurezza: se
-- una riga avesse solo file_url, il percorso si ricava dall'URL firmato
-- (…/storage/v1/object/sign/<bucket>/<percorso>?token=…) e il tasto
-- «Scarica» continua a funzionare. Idempotente, nessuna riga esistente
-- cambia se file_path è già valorizzato.

UPDATE "medical_certificates"
SET "file_path" = substring("file_url" from '/medical-certificates/([^?]+)')
WHERE "file_path" IS NULL
  AND "file_url" ~ '/medical-certificates/[^?]+';

UPDATE "affiliations"
SET "file_path" = substring("file_url" from '/affiliation-cards/([^?]+)')
WHERE "file_path" IS NULL
  AND "file_url" ~ '/affiliation-cards/[^?]+';
