-- Tessere ENDAS: la tabella affiliations esisteva già per il tesseramento
-- (ente, numero tessera, anno sociale, scadenza) e ha il vincolo giusto —
-- una per allieva, per ente, per anno. Qui si aggiunge quello che mancava
-- per gestirla come i certificati medici: tipo, data di iscrizione, PDF
-- allegato, soft delete e autore del caricamento.

ALTER TABLE "affiliations"
  ADD COLUMN "card_type" TEXT,
  ADD COLUMN "issue_date" DATE,
  ADD COLUMN "file_path" TEXT,
  ADD COLUMN "file_url" TEXT,
  ADD COLUMN "created_by" UUID,
  ADD COLUMN "deleted_at" TIMESTAMPTZ(6);

-- Il vincolo diventa parziale: una tessera cestinata non deve tenere
-- occupato l'anno, altrimenti dopo aver cestinato il PDF sbagliato non si
-- potrebbe caricare quello giusto per lo stesso anno.
--
-- Prisma realizza @@unique come indice unico, non come constraint di tabella:
-- in produzione infatti `affiliations_athlete_id_entity_card_year_key` è in
-- pg_indexes e non in pg_constraint. Si buttano giù tutti e due i casi, così
-- la migration vale anche dove fosse stato creato come constraint.
ALTER TABLE "affiliations"
  DROP CONSTRAINT IF EXISTS "affiliations_athlete_id_entity_card_year_key";

DROP INDEX IF EXISTS "affiliations_athlete_id_entity_card_year_key";

CREATE UNIQUE INDEX "affiliations_active_card_per_year_key"
  ON "affiliations"("athlete_id", "entity", "card_year")
  WHERE "deleted_at" IS NULL;

-- Tessera corrente di un'allieva: scadenza più lontana fra le non cestinate
CREATE INDEX "affiliations_athlete_id_expiry_date_idx"
  ON "affiliations"("athlete_id", "expiry_date");
