-- CreateEnum
CREATE TYPE "EmailTrigger" AS ENUM ('ADMIN_MANUAL', 'CRON');

-- AlterTable
ALTER TABLE "email_logs" ADD COLUMN     "milestone_key" TEXT,
ADD COLUMN     "triggered_by" "EmailTrigger" NOT NULL DEFAULT 'ADMIN_MANUAL';

-- AlterTable
ALTER TABLE "reminder_config" ADD COLUMN     "days_before_due" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "exclude_weekends" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updated_by" UUID;

-- CreateIndex
CREATE INDEX "email_logs_payment_schedule_id_milestone_key_idx" ON "email_logs"("payment_schedule_id", "milestone_key");
