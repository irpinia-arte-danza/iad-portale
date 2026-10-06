-- Irrobustimento: la Data API di Supabase (PostgREST) non deve leggere né
-- scrivere le tabelle del gestionale. Il portale parla con il database solo
-- tramite Prisma, lato server, con il ruolo postgres: i ruoli `anon` e
-- `authenticated` (quelli della chiave pubblica e dei JWT dei genitori) non
-- hanno niente da fare nello schema public.
--
-- Finora questi REVOKE erano fatti a mano sulla dashboard e sorvegliati dal
-- controllo notturno del repo di backup (docs/runbook.md, «Quando il
-- controllo Data API fallisce»). Da qui in poi stanno nelle migration: un
-- database ricostruito da zero nasce chiuso. Il controllo notturno resta.
--
-- NESSUNA RLS: resta spenta di proposito (docs/gotchas.md §17.46). Con il
-- Prisma che bypassa RLS e nessun client che usa la Data API, le policy
-- sarebbero codice che non gira mai; la chiusura sta nei grant.
--
-- Idempotente: REVOKE su un privilegio già tolto non fa niente; i ruoli
-- Supabase possono non esistere (Postgres locale, CI): in quel caso non si
-- fa nulla. Niente che tocchi il ruolo con cui gira Prisma.

DO $$
DECLARE
  r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', r);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', r);
      EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM %I', r);
      EXECUTE format('REVOKE USAGE ON SCHEMA public FROM %I', r);

      -- Tabelle, sequenze e funzioni create in futuro dal ruolo corrente
      -- (Prisma): niente grant automatici
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', r);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I', r);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM %I', r);

      -- Su Supabase i default privileges sono definiti per il ruolo
      -- postgres: se non siamo noi quel ruolo, si tolgono anche lì
      IF current_user <> 'postgres' AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
        BEGIN
          EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM %I', r);
          EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I', r);
          EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM %I', r);
        EXCEPTION WHEN insufficient_privilege THEN
          RAISE NOTICE 'default privileges del ruolo postgres non modificabili da %', current_user;
        END;
      END IF;
    END IF;
  END LOOP;
END $$;
