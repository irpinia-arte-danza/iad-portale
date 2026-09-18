-- Ruolo ATHLETE: allieva maggiorenne che accede per sé (corso adulti).
--
-- Finché non esiste un flusso di invito per le allieve nessun utente avrà
-- questo ruolo, quindi in produzione questa migration non cambia niente:
-- aggiunge solo il valore su cui si appoggeranno le guardie e le query.
--
-- ALTER TYPE in una migration a sé: il valore nuovo non è utilizzabile nella
-- stessa transazione in cui viene aggiunto.

ALTER TYPE "UserRole" ADD VALUE 'ATHLETE';
