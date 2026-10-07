-- Intestatario del conto per i bonifici delle famiglie (Impostazioni ›
-- Associazione). Additiva; se vuoto il portale mostra il nome dell'ASD.

-- AlterTable
ALTER TABLE "brand_settings" ADD COLUMN "bank_account_holder" TEXT;
