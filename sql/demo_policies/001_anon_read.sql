-- 001_anon_read.sql
-- Demo project only. DO NOT apply to the real Provender project.
--
-- Grants READ access to every table in the public schema for BOTH anon
-- (unauthenticated) and authenticated visitors. Writes stay blocked —
-- nobody can insert, update, or delete via the client.
--
-- Why both roles: the demo lets a visitor sign in and then toggle freely
-- between persona views (farmer / buyer / policymaker / etc.) to see the
-- pitch. Without TO public, signed-in users hit empty tables because RLS
-- denies anything not explicitly allowed for their role. The real build
-- replaces this with per-table, entitlement-aware policies.
--
-- Idempotent: safe to re-run. Existing "anon read" policies are replaced.
-- Robust: tables we cannot modify (e.g. extension-managed like PostGIS's
-- spatial_ref_sys) are skipped with a NOTICE instead of crashing the loop.
--
-- Target project: lxehhllpomioqvjdjqzq.supabase.co
-- First applied: 2026-04-21
-- Updated 2026-04-26: TO anon → TO public so authenticated users can read.

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
      EXECUTE format('CREATE POLICY "anon read" ON %I.%I FOR SELECT TO public USING (true)', t.schemaname, t.tablename);
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'Skipped %.% (no permission — likely extension-managed)', t.schemaname, t.tablename;
    END;
  END LOOP;
END $$;
