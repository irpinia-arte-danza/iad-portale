-- Sprint 6.B — Saggio annuale (Showcase)
-- Adds: PaymentMode enum, soft-delete + paymentMode on showcase_participations,
-- showcase_participation_id on payment_schedules (XOR with course / stage),
-- 6 AuditAction values.

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('SINGLE', 'SPLIT');

-- AlterEnum — AuditAction values for Sprint 6.B
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SHOWCASE_CREATE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SHOWCASE_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SHOWCASE_DELETE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SHOWCASE_PARTICIPATION_CREATE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SHOWCASE_PARTICIPATION_CONFIRM';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SHOWCASE_PARTICIPATION_DELETE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'RESTORE_SHOWCASE';

-- AlterTable: showcases → soft delete
ALTER TABLE "showcases" ADD COLUMN "deleted_at" TIMESTAMPTZ(6);

-- AlterTable: showcase_participations → paymentMode + audit timestamps
ALTER TABLE "showcase_participations"
  ADD COLUMN "payment_mode" "PaymentMode",
  ADD COLUMN "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  ADD COLUMN "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW();

-- AlterTable: payment_schedules → polymorphic on course OR stage OR showcase
ALTER TABLE "payment_schedules" ADD COLUMN "showcase_participation_id" UUID;

-- CreateIndex
CREATE INDEX "payment_schedules_showcase_participation_id_due_date_idx"
  ON "payment_schedules"("showcase_participation_id", "due_date");

-- AddForeignKey (showcase participation)
ALTER TABLE "payment_schedules"
  ADD CONSTRAINT "payment_schedules_showcase_participation_id_fkey"
  FOREIGN KEY ("showcase_participation_id") REFERENCES "showcase_participations"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Drop the previous XOR CHECK (2-way) and recreate as 3-way XOR
ALTER TABLE "payment_schedules" DROP CONSTRAINT IF EXISTS "payment_schedules_one_event_chk";

ALTER TABLE "payment_schedules"
  ADD CONSTRAINT "payment_schedules_one_event_chk"
  CHECK (
    (
      ("course_enrollment_id" IS NOT NULL)::int
      + ("stage_enrollment_id" IS NOT NULL)::int
      + ("showcase_participation_id" IS NOT NULL)::int
    ) = 1
  );
