-- Quota associativa annuale: una scadenza per allieva per anno accademico,
-- collegata direttamente all'allieva e non a un corso (resta dovuta anche se
-- l'allieva si ritira da un corso o ne frequenta più d'uno).

ALTER TABLE "payment_schedules" ADD COLUMN "athlete_id" UUID;

ALTER TABLE "payment_schedules"
  ADD CONSTRAINT "payment_schedules_athlete_id_fkey"
  FOREIGN KEY ("athlete_id") REFERENCES "athletes"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Una sola quota per allieva e anno (athlete_id è NULL per tutte le altre scadenze)
CREATE UNIQUE INDEX "payment_schedules_athlete_id_academic_year_id_key"
  ON "payment_schedules"("athlete_id", "academic_year_id");

-- Ogni scadenza resta collegata a esattamente un evento, ora anche l'allieva
ALTER TABLE "payment_schedules" DROP CONSTRAINT "payment_schedules_one_event_chk";
ALTER TABLE "payment_schedules"
  ADD CONSTRAINT "payment_schedules_one_event_chk" CHECK (
    (course_enrollment_id IS NOT NULL)::integer
    + (stage_enrollment_id IS NOT NULL)::integer
    + (showcase_participation_id IS NOT NULL)::integer
    + (costume_assignment_id IS NOT NULL)::integer
    + (athlete_id IS NOT NULL)::integer = 1
  );

-- Collegamento all'allieva solo per la quota associativa, e viceversa
ALTER TABLE "payment_schedules"
  ADD CONSTRAINT "payment_schedules_association_athlete_chk" CHECK (
    (athlete_id IS NOT NULL) = (fee_type = 'ASSOCIATION')
  );
