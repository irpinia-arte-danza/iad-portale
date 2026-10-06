-- GDPR tecnico: i consensi cartacei registrati dalla segreteria hanno una
-- nota libera e vanno nel Cestino invece di sparire. Solo colonne nuove,
-- nullable: nessuna riga esistente cambia. L'indice (athlete_id, type) c'è
-- già dalla init.

ALTER TABLE "consents"
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "deleted_at" TIMESTAMPTZ(6);
