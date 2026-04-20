/*
  Warnings:

  - Changed the type of `relationship` on the `athlete_parents` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ParentRelationship" AS ENUM ('MOTHER', 'FATHER', 'GRANDPARENT', 'TUTOR', 'OTHER');

-- AlterTable
ALTER TABLE "athlete_parents" ADD COLUMN     "is_primary_contact" BOOLEAN NOT NULL DEFAULT false,
DROP COLUMN "relationship",
ADD COLUMN     "relationship" "ParentRelationship" NOT NULL;

-- AlterTable
ALTER TABLE "parents" ADD COLUMN     "receives_email_communications" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex (partial unique: at most one primary payer per athlete)
CREATE UNIQUE INDEX "unique_primary_payer_per_athlete"
  ON "athlete_parents" ("athlete_id")
  WHERE "is_primary_payer" = true;

-- CreateIndex (partial unique: at most one primary contact per athlete)
CREATE UNIQUE INDEX "unique_primary_contact_per_athlete"
  ON "athlete_parents" ("athlete_id")
  WHERE "is_primary_contact" = true;
