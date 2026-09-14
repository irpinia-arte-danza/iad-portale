-- Sprint ricevuta lato admin.
-- - stato ricevuta (valida / annullata): una ricevuta emessa non si cancella,
--   si annulla mantenendo il numero
-- - progressivo numerico per ordinare correttamente (".../100" dopo ".../99")
-- - dati congelati all'emissione (pagante, allieva, codici fiscali)
-- Additiva: al momento del rilascio non esistono ricevute emesse.

-- CreateEnum
CREATE TYPE "ReceiptStatus" AS ENUM ('VALID', 'CANCELLED');

-- AlterTable
ALTER TABLE "receipts" ADD COLUMN     "athlete_fiscal_code" TEXT,
ADD COLUMN     "athlete_name" TEXT,
ADD COLUMN     "cancel_reason" TEXT,
ADD COLUMN     "cancelled_at" TIMESTAMPTZ(6),
ADD COLUMN     "cancelled_by" UUID,
ADD COLUMN     "issued_by" UUID,
ADD COLUMN     "payer_address" TEXT,
ADD COLUMN     "sequence" INTEGER,
ADD COLUMN     "status" "ReceiptStatus" NOT NULL DEFAULT 'VALID';

-- CreateIndex
CREATE INDEX "receipts_issue_date_sequence_idx" ON "receipts"("issue_date", "sequence");
