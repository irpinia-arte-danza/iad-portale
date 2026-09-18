-- Invito di accesso a un'allieva maggiorenne, tracciato in AuditLog come già
-- INVITE_PARENT e INVITE_TEACHER.
--
-- ALTER TYPE in una migration a sé: il valore nuovo non è utilizzabile nella
-- stessa transazione in cui viene aggiunto.

ALTER TYPE "AuditAction" ADD VALUE 'INVITE_ATHLETE';
