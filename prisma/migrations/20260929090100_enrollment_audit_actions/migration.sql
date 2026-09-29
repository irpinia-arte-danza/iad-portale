-- Annullamento e ritiro di un'iscrizione, ripristino ed eliminazione
-- definitiva dal Cestino.
--
-- ALTER TYPE in una migration a sé: i valori nuovi non sono utilizzabili
-- nella stessa transazione in cui vengono aggiunti.

ALTER TYPE "AuditAction" ADD VALUE 'ENROLLMENT_CANCEL';
ALTER TYPE "AuditAction" ADD VALUE 'ENROLLMENT_WITHDRAW';
ALTER TYPE "AuditAction" ADD VALUE 'RESTORE_ENROLLMENT';
ALTER TYPE "AuditAction" ADD VALUE 'HARD_DELETE_ENROLLMENT';
