-- Tessere ENDAS: caricamento (singolo e in blocco), cestino ed export
-- dell'elenco da tesserare per il referente dell'ente.
--
-- ALTER TYPE in una migration a sé: i valori nuovi non sono utilizzabili
-- nella stessa transazione in cui vengono aggiunti.

ALTER TYPE "AuditAction" ADD VALUE 'CARD_CREATE';
ALTER TYPE "AuditAction" ADD VALUE 'CARD_IMPORT';
ALTER TYPE "AuditAction" ADD VALUE 'CARD_DELETE';
ALTER TYPE "AuditAction" ADD VALUE 'RESTORE_CARD';
ALTER TYPE "AuditAction" ADD VALUE 'HARD_DELETE_CARD';
ALTER TYPE "AuditAction" ADD VALUE 'AFFILIATION_EXPORT';
