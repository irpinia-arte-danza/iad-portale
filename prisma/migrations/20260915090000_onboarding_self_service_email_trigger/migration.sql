-- Sprint onboarding: trigger per email avviate dall'utente stesso
-- (es. "Password dimenticata"), distinto da invio manuale admin e cron.
ALTER TYPE "EmailTrigger" ADD VALUE 'SELF_SERVICE';
