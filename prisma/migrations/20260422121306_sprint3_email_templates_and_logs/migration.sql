-- CreateEnum
CREATE TYPE "EmailCategory" AS ENUM ('SOLLECITO', 'PROMEMORIA', 'BENVENUTO', 'CONFERMA', 'COMUNICAZIONE');

-- AlterEnum
BEGIN;
CREATE TYPE "EmailStatus_new" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'OPENED', 'BOUNCED', 'COMPLAINED', 'FAILED');
ALTER TABLE "public"."email_logs" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "email_logs" ALTER COLUMN "status" TYPE "EmailStatus_new" USING ("status"::text::"EmailStatus_new");
ALTER TYPE "EmailStatus" RENAME TO "EmailStatus_old";
ALTER TYPE "EmailStatus_new" RENAME TO "EmailStatus";
DROP TYPE "public"."EmailStatus_old";
COMMIT;

-- DropIndex
DROP INDEX "email_logs_to_email_created_at_idx";

-- DropIndex
DROP INDEX "email_logs_type_status_idx";

-- AlterTable
ALTER TABLE "email_logs" DROP CONSTRAINT "email_logs_pkey",
DROP COLUMN "created_at",
DROP COLUMN "payment_id",
DROP COLUMN "resend_id",
DROP COLUMN "to_email",
DROP COLUMN "triggered_by",
DROP COLUMN "type",
ADD COLUMN     "body_html" TEXT NOT NULL,
ADD COLUMN     "body_text" TEXT,
ADD COLUMN     "bounced_at" TIMESTAMPTZ(6),
ADD COLUMN     "delivered_at" TIMESTAMPTZ(6),
ADD COLUMN     "opened_at" TIMESTAMPTZ(6),
ADD COLUMN     "payment_schedule_id" UUID,
ADD COLUMN     "provider_id" TEXT,
ADD COLUMN     "recipient_email" TEXT NOT NULL,
ADD COLUMN     "recipient_name" TEXT,
ADD COLUMN     "sent_by" UUID NOT NULL,
ADD COLUMN     "template_slug" TEXT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "status" DROP DEFAULT,
ALTER COLUMN "sent_at" SET NOT NULL,
ALTER COLUMN "sent_at" SET DEFAULT CURRENT_TIMESTAMP,
ADD CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id");

-- DropEnum
DROP TYPE "EmailType";

-- CreateTable
CREATE TABLE "email_templates" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "subject" TEXT NOT NULL,
    "body_html" TEXT NOT NULL,
    "body_text" TEXT,
    "category" "EmailCategory" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_templates_slug_key" ON "email_templates"("slug");

-- CreateIndex
CREATE INDEX "email_logs_sent_by_sent_at_idx" ON "email_logs"("sent_by", "sent_at");

-- CreateIndex
CREATE INDEX "email_logs_recipient_email_sent_at_idx" ON "email_logs"("recipient_email", "sent_at");

-- CreateIndex
CREATE INDEX "email_logs_athlete_id_sent_at_idx" ON "email_logs"("athlete_id", "sent_at");

-- CreateIndex
CREATE INDEX "email_logs_parent_id_sent_at_idx" ON "email_logs"("parent_id", "sent_at");

-- CreateIndex
CREATE INDEX "email_logs_payment_schedule_id_idx" ON "email_logs"("payment_schedule_id");

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_sent_by_fkey" FOREIGN KEY ("sent_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_template_slug_fkey" FOREIGN KEY ("template_slug") REFERENCES "email_templates"("slug") ON DELETE SET NULL ON UPDATE CASCADE;

