-- Invio della ricevuta per email: azione tracciata in AuditLog, come già
-- MEDICAL_CERT_EMAIL_SENT e STAGE_EMAIL_SENT.
-- ALTER TYPE in una migration a sé: il valore nuovo non è utilizzabile nella
-- stessa transazione in cui viene aggiunto.

ALTER TYPE "AuditAction" ADD VALUE 'RECEIPT_EMAIL_SENT';
