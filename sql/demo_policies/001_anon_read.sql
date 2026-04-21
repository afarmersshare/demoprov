-- 001_anon_read.sql
-- Demo project only. DO NOT apply to the real Provender project.
--
-- Grants public (unauthenticated) READ access to every table in the public
-- schema of the demo Supabase project. Writes stay blocked — anon cannot
-- insert, update, or delete.
--
-- Idempotent: safe to re-run. Existing "anon read" policies are replaced.
-- Robust: tables we cannot modify (e.g. extension-managed like PostGIS's
-- spatial_ref_sys) are skipped with a NOTICE instead of crashing the loop.
--
-- Target project: lxehhllpomioqvjdjqzq.supabase.co
-- First applied: 2026-04-21

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS "anon read" ON %I.%I', t.schemaname, t.tablename);
      EXECUTE format('CREATE POLICY "anon read" ON %I.%I FOR SELECT TO anon USING (true)', t.schemaname, t.tablename);
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'Skipped %.% (no permission — likely extension-managed)', t.schemaname, t.tablename;
    END;
  END LOOP;
END $$;
