-- Correzione a mano dell'importo di una scadenza non pagata, nei due versi.
-- Serviva perché all'incasso l'importo può solo scendere, e dopo lo storno di
-- un incasso ridotto la scadenza tornava dovuta con l'importo abbassato.
--
-- ALTER TYPE in una migration a sé: il valore nuovo non è utilizzabile nella
-- stessa transazione in cui viene aggiunto.

ALTER TYPE "AuditAction" ADD VALUE 'SCHEDULE_AMOUNT_UPDATE';
