-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('DUE', 'PAID', 'WAIVED', 'OVERDUE');

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "course_enrollment_id" UUID;

-- CreateTable
CREATE TABLE "payment_schedules" (
    "id" UUID NOT NULL,
    "course_enrollment_id" UUID NOT NULL,
    "academic_year_id" UUID NOT NULL,
    "fee_type" "FeeType" NOT NULL,
    "due_date" DATE NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "status" "ScheduleStatus" NOT NULL DEFAULT 'DUE',
    "payment_id" UUID,
    "waiver_reason" TEXT,
    "notes" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payment_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_schedules_payment_id_key" ON "payment_schedules"("payment_id");

-- CreateIndex
CREATE INDEX "payment_schedules_course_enrollment_id_due_date_idx" ON "payment_schedules"("course_enrollment_id", "due_date");

-- CreateIndex
CREATE INDEX "payment_schedules_status_due_date_idx" ON "payment_schedules"("status", "due_date");

-- CreateIndex
CREATE INDEX "payment_schedules_academic_year_id_status_idx" ON "payment_schedules"("academic_year_id", "status");

-- CreateIndex
CREATE INDEX "payments_fee_type_payment_date_idx" ON "payments"("fee_type", "payment_date");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_course_enrollment_id_fkey" FOREIGN KEY ("course_enrollment_id") REFERENCES "course_enrollments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_schedules" ADD CONSTRAINT "payment_schedules_course_enrollment_id_fkey" FOREIGN KEY ("course_enrollment_id") REFERENCES "course_enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_schedules" ADD CONSTRAINT "payment_schedules_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_schedules" ADD CONSTRAINT "payment_schedules_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
