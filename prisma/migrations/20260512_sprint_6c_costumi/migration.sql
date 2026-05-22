-- Sprint 6.C — Costumi saggio
-- Adds: soft-delete + updatedAt on costumes, size + audit timestamps on
-- costume_assignments, costume_assignment_id on payment_schedules (XOR with
-- course / stage / showcase), 6 AuditAction values.

-- AlterEnum — AuditAction values for Sprint 6.C
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'COSTUME_CREATE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'COSTUME_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'COSTUME_DELETE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'COSTUME_ASSIGN';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'COSTUME_UNASSIGN';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'RESTORE_COSTUME';

-- AlterTable: costumes → soft delete + updatedAt
ALTER TABLE "costumes"
  ADD COLUMN "deleted_at" TIMESTAMPTZ(6),
  ADD COLUMN "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW();

-- AlterTable: costume_assignments → size + audit timestamps
ALTER TABLE "costume_assignments"
  ADD COLUMN "size" TEXT,
  ADD COLUMN "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  ADD COLUMN "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW();

-- AlterTable: payment_schedules → polymorphic on course OR stage OR showcase OR costume
ALTER TABLE "payment_schedules" ADD COLUMN "costume_assignment_id" UUID;

-- Unique 1:1 (each costume assignment has at most one schedule)
CREATE UNIQUE INDEX "payment_schedules_costume_assignment_id_key"
  ON "payment_schedules"("costume_assignment_id");

-- AddForeignKey (costume assignment)
ALTER TABLE "payment_schedules"
  ADD CONSTRAINT "payment_schedules_costume_assignment_id_fkey"
  FOREIGN KEY ("costume_assignment_id") REFERENCES "costume_assignments"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Drop the previous XOR CHECK (3-way) and recreate as 4-way XOR
ALTER TABLE "payment_schedules" DROP CONSTRAINT IF EXISTS "payment_schedules_one_event_chk";

ALTER TABLE "payment_schedules"
  ADD CONSTRAINT "payment_schedules_one_event_chk"
  CHECK (
    (
      ("course_enrollment_id" IS NOT NULL)::int
      + ("stage_enrollment_id" IS NOT NULL)::int
      + ("showcase_participation_id" IS NOT NULL)::int
      + ("costume_assignment_id" IS NOT NULL)::int
    ) = 1
  );
