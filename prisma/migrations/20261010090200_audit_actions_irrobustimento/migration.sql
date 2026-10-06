-- Irrobustimento: azioni dell'audit per anagrafiche (allieve, genitori,
-- insegnanti, corsi, spese), pagamenti modificati o cancellati, genitori
-- collegati o scollegati, export annuale.
--
-- ALTER TYPE in una migration a sé: il valore nuovo non è utilizzabile nella
-- stessa transazione in cui viene aggiunto.

ALTER TYPE "AuditAction" ADD VALUE 'ATHLETE_CREATE';
ALTER TYPE "AuditAction" ADD VALUE 'ATHLETE_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE 'ATHLETE_SOFT_DELETE';
ALTER TYPE "AuditAction" ADD VALUE 'PARENT_CREATE';
ALTER TYPE "AuditAction" ADD VALUE 'PARENT_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE 'PARENT_SOFT_DELETE';
ALTER TYPE "AuditAction" ADD VALUE 'TEACHER_CREATE';
ALTER TYPE "AuditAction" ADD VALUE 'TEACHER_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE 'TEACHER_SOFT_DELETE';
ALTER TYPE "AuditAction" ADD VALUE 'COURSE_CREATE';
ALTER TYPE "AuditAction" ADD VALUE 'COURSE_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE 'EXPENSE_CREATE';
ALTER TYPE "AuditAction" ADD VALUE 'EXPENSE_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE 'EXPENSE_SOFT_DELETE';
ALTER TYPE "AuditAction" ADD VALUE 'PAYMENT_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE 'PAYMENT_DELETE';
ALTER TYPE "AuditAction" ADD VALUE 'GUARDIAN_LINK';
ALTER TYPE "AuditAction" ADD VALUE 'GUARDIAN_UNLINK';
ALTER TYPE "AuditAction" ADD VALUE 'ANNUAL_EXPORT';
