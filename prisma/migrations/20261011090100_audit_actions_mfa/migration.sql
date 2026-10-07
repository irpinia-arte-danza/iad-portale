-- Secondo fattore degli admin: iscrizione completata e azzeramento da parte
-- dell'altro admin.
--
-- ALTER TYPE in una migration a sé: il valore nuovo non è utilizzabile nella
-- stessa transazione in cui viene aggiunto.

ALTER TYPE "AuditAction" ADD VALUE 'MFA_ENROLL';
ALTER TYPE "AuditAction" ADD VALUE 'MFA_RESET';
