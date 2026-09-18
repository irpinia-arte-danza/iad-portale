-- Collegamento fra un'allieva e il suo account.
--
-- Vale solo per le maggiorenni senza genitori collegati: chi ha un genitore
-- entra dall'account del genitore, non da uno proprio. Per questo la colonna
-- è opzionale e unica: al massimo un account per allieva, al massimo
-- un'allieva per account.
--
-- ON DELETE SET NULL: se l'utente sparisce l'anagrafica dell'allieva resta.
-- L'allieva è un'entità della scuola, l'account è solo un modo per entrare.

ALTER TABLE "athletes" ADD COLUMN "user_id" UUID;

CREATE UNIQUE INDEX "athletes_user_id_key" ON "athletes"("user_id");

ALTER TABLE "athletes"
  ADD CONSTRAINT "athletes_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
