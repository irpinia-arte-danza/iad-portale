-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'UPDATE_BRAND';
ALTER TYPE "AuditAction" ADD VALUE 'UPDATE_ASSOCIATION';
ALTER TYPE "AuditAction" ADD VALUE 'UPDATE_RICEVUTE';
ALTER TYPE "AuditAction" ADD VALUE 'UPDATE_PROFILE';
ALTER TYPE "AuditAction" ADD VALUE 'CHANGE_PASSWORD';
ALTER TYPE "AuditAction" ADD VALUE 'INVITE_ADMIN';
ALTER TYPE "AuditAction" ADD VALUE 'LOGO_UPLOAD';
ALTER TYPE "AuditAction" ADD VALUE 'LOGO_DELETE';

-- AlterTable
ALTER TABLE "brand_settings" ADD COLUMN     "address_city" TEXT,
ADD COLUMN     "address_province" CHAR(2),
ADD COLUMN     "address_street" TEXT,
ADD COLUMN     "address_zip" VARCHAR(5),
ADD COLUMN     "asd_pec" TEXT,
ADD COLUMN     "asd_sdi_code" TEXT,
ADD COLUMN     "asd_vat_number" TEXT,
ADD COLUMN     "gym_address" TEXT,
ADD COLUMN     "gym_same_as_legal" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "logo_svg_url" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "locale_preference" TEXT DEFAULT 'it';

-- CreateTable
CREATE TABLE "receipt_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "receipt_prefix" TEXT NOT NULL DEFAULT 'IAD/',
    "receipt_number" INTEGER NOT NULL DEFAULT 0,
    "receipt_footer" TEXT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "receipt_settings_pkey" PRIMARY KEY ("id")
);
