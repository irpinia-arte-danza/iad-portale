-- GDPR tecnico: la liberatoria foto/video si registra in due consensi
-- distinti (uso interno; sito e social). IMAGE_RELEASE resta per i dati
-- storici, se mai ce ne saranno.
--
-- ALTER TYPE in una migration a sé: il valore nuovo non è utilizzabile nella
-- stessa transazione in cui viene aggiunto.

ALTER TYPE "ConsentType" ADD VALUE 'IMAGE_RELEASE_INTERNAL';
ALTER TYPE "ConsentType" ADD VALUE 'IMAGE_RELEASE_PUBLIC';
