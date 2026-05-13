-- Sprint 6.A — Stage workshop
-- Adds: StageAttendanceStatus enum, attendance on stage_enrollments,
-- deleted_at on stages, stage_enrollment_id on payment_schedules
-- (and relaxes course_enrollment_id to nullable so PaymentSchedule
-- can be polymorphic: either course OR stage).

-- CreateEnum
CREATE TYPE "StageAttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'N_A');

-- AlterEnum — AuditAction values for Sprint 6.A
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'STAGE_CREATE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'STAGE_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'STAGE_DELETE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'STAGE_ENROLLMENT_CREATE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'STAGE_ENROLLMENT_DELETE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'STAGE_ATTENDANCE_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'STAGE_EMAIL_SENT';

-- DropForeignKey (will recreate with SET NULL since column becomes nullable)
ALTER TABLE "payment_schedules" DROP CONSTRAINT "payment_schedules_course_enrollment_id_fkey";

-- AlterTable: payment_schedules → polymorphic on course OR stage enrollment
ALTER TABLE "payment_schedules"
  ADD COLUMN "stage_enrollment_id" UUID,
  ALTER COLUMN "course_enrollment_id" DROP NOT NULL;

-- AlterTable: stage_enrollments → attendance per atleta (null = non ancora segnata)
ALTER TABLE "stage_enrollments" ADD COLUMN "attendance" "StageAttendanceStatus";

-- AlterTable: stages → soft delete (deletedAt)
ALTER TABLE "stages" ADD COLUMN "deleted_at" TIMESTAMPTZ(6);

-- CreateIndex
CREATE UNIQUE INDEX "payment_schedules_stage_enrollment_id_key" ON "payment_schedules"("stage_enrollment_id");
CREATE INDEX "payment_schedules_stage_enrollment_id_due_date_idx" ON "payment_schedules"("stage_enrollment_id", "due_date");

-- AddForeignKey (course: relaxed to SET NULL because nullable)
ALTER TABLE "payment_schedules"
  ADD CONSTRAINT "payment_schedules_course_enrollment_id_fkey"
  FOREIGN KEY ("course_enrollment_id") REFERENCES "course_enrollments"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey (stage)
ALTER TABLE "payment_schedules"
  ADD CONSTRAINT "payment_schedules_stage_enrollment_id_fkey"
  FOREIGN KEY ("stage_enrollment_id") REFERENCES "stage_enrollments"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- CheckConstraint: exactly one of course_enrollment_id / stage_enrollment_id must be set
ALTER TABLE "payment_schedules"
  ADD CONSTRAINT "payment_schedules_one_event_chk"
  CHECK (
    ("course_enrollment_id" IS NOT NULL AND "stage_enrollment_id" IS NULL)
    OR
    ("course_enrollment_id" IS NULL AND "stage_enrollment_id" IS NOT NULL)
  );
