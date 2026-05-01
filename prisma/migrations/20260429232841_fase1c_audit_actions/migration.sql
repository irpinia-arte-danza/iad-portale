-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'MEDICAL_CERT_EMAIL_SENT';
ALTER TYPE "AuditAction" ADD VALUE 'HARD_DELETE_ATHLETE';
ALTER TYPE "AuditAction" ADD VALUE 'HARD_DELETE_PARENT';
ALTER TYPE "AuditAction" ADD VALUE 'HARD_DELETE_TEACHER';
ALTER TYPE "AuditAction" ADD VALUE 'HARD_DELETE_COURSE';
ALTER TYPE "AuditAction" ADD VALUE 'HARD_DELETE_EXPENSE';
ALTER TYPE "AuditAction" ADD VALUE 'HARD_DELETE_MEDICAL_CERT';
