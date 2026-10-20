-- Ruolo «Referente tessere» e le due azioni di audit del suo accesso.
-- Additiva: solo valori nuovi negli enum, in una migration loro (§17.5).

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'CARD_MANAGER';

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'INVITE_CARD_MANAGER';
ALTER TYPE "AuditAction" ADD VALUE 'REVOKE_CARD_MANAGER';
