-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'CERT_CREATE';
ALTER TYPE "AuditAction" ADD VALUE 'CERT_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE 'CERT_DELETE';
ALTER TYPE "AuditAction" ADD VALUE 'RESTORE_ATHLETE';
ALTER TYPE "AuditAction" ADD VALUE 'RESTORE_PARENT';
ALTER TYPE "AuditAction" ADD VALUE 'RESTORE_TEACHER';
ALTER TYPE "AuditAction" ADD VALUE 'RESTORE_COURSE';
ALTER TYPE "AuditAction" ADD VALUE 'RESTORE_EXPENSE';
ALTER TYPE "AuditAction" ADD VALUE 'RESTORE_CERT';

-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "deleted_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "medical_certificates" ADD COLUMN     "deleted_at" TIMESTAMPTZ(6),
ADD COLUMN     "file_path" TEXT,
ADD COLUMN     "notes" TEXT;
