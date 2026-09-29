-- Annullare un'iscrizione sbagliata e ritirarsi davvero sono due cose diverse,
-- e finora c'era solo il ritiro: correggere un errore lasciava l'iscrizione
-- come "ritirata" e tutte le sue rate ancora dovute.
--
-- Serve il soft delete su entrambi i livelli. Sull'iscrizione perché va nel
-- Cestino come il resto del progetto; sulla rata perché il ritiro butta via
-- solo le rate successive alla data di ritiro — quelle fino a quel giorno
-- restano dovute, sono mesi frequentati — e perché il contributo di iscrizione
-- annuale è appeso all'allieva, non all'iscrizione, quindi non può seguirla
-- attraverso la relazione.

ALTER TABLE "course_enrollments" ADD COLUMN "deleted_at" TIMESTAMPTZ(6);
ALTER TABLE "payment_schedules" ADD COLUMN "deleted_at" TIMESTAMPTZ(6);

-- I due vincoli unici diventano PARZIALI. Senza la condizione, un'iscrizione
-- annullata terrebbe occupato il posto e l'allieva non potrebbe reiscriversi
-- allo stesso corso: è il punto #7 dell'audit. Idem per il contributo di
-- iscrizione, che dopo un annullamento deve poter tornare.
--
-- Prisma realizza @@unique come indice unico, non come constraint di tabella:
-- in produzione infatti entrambi stanno in pg_indexes e non in pg_constraint.
-- Si buttano giù tutti e due i casi, così la migration vale anche dove fossero
-- stati creati come constraint.

ALTER TABLE "course_enrollments"
  DROP CONSTRAINT IF EXISTS "course_enrollments_athlete_id_course_id_academic_year_id_key";
DROP INDEX IF EXISTS "course_enrollments_athlete_id_course_id_academic_year_id_key";

CREATE UNIQUE INDEX "course_enrollments_active_per_year_key"
  ON "course_enrollments"("athlete_id", "course_id", "academic_year_id")
  WHERE "deleted_at" IS NULL;

ALTER TABLE "payment_schedules"
  DROP CONSTRAINT IF EXISTS "payment_schedules_athlete_id_academic_year_id_key";
DROP INDEX IF EXISTS "payment_schedules_athlete_id_academic_year_id_key";

CREATE UNIQUE INDEX "payment_schedules_active_association_fee_key"
  ON "payment_schedules"("athlete_id", "academic_year_id")
  WHERE "deleted_at" IS NULL;

-- Le liste di rate aperte filtrano sempre su deleted_at: che l'indice lo sappia
CREATE INDEX "payment_schedules_deleted_at_status_due_date_idx"
  ON "payment_schedules"("deleted_at", "status", "due_date");

-- Iscrizioni attive di un'allieva: la scheda e i controlli sull'ultima
-- iscrizione dell'anno passano da qui
CREATE INDEX "course_enrollments_athlete_id_deleted_at_idx"
  ON "course_enrollments"("athlete_id", "deleted_at");
