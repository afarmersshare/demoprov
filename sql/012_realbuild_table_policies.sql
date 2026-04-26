-- 012_realbuild_table_policies.sql
-- Real-build (production Provender project) RLS for the entity tables.
-- DO NOT apply to the demo project — the demo continues to use the
-- blanket "TO public" open read in sql/demo_policies/001_anon_read.sql so
-- anonymous prospects can browse the pitch surface without signing in.
--
-- Target project: the real Provender Supabase project (NOT lxehhllpomioqvjdjqzq).
--
-- ----------------------------------------------------------------------------
-- ACCESS MODEL
-- ----------------------------------------------------------------------------
--
--   anonymous (anon)          → no access to any business data. Real
--                                Provender is a paid SaaS; a logged-out
--                                visitor sees the marketing site, not the
--                                directory.
--
--   authenticated (tenant)    → SELECT on every entity table. The directory
--                                IS the product — every paying tier sees
--                                every row. Module/tab gating (which tab
--                                renders the data live vs. as an upsell)
--                                is enforced client-side via
--                                user_module_entitlements (see 008, 010).
--                                That's a UX gate, not a row-level secrecy
--                                gate.
--
--   field-level secrecy       → handled IN THE APPLICATION, not RLS. The
--                                entity-detail-panel masks fields like
--                                contact email/address based on
--                                contact_visibility and the viewer's tier.
--                                Trying to do this at the row level would
--                                require a JOIN to user_profiles on every
--                                read and is the wrong layer.
--
--   writes (any client role)  → denied. RLS is deny-by-default; we do NOT
--                                add INSERT/UPDATE/DELETE policies for
--                                `authenticated`. Mutations happen
--                                exclusively via the service-role key from
--                                admin tooling, which bypasses RLS.
--
-- ----------------------------------------------------------------------------
-- WHY NOT ENTITLEMENT-AWARE ROW POLICIES?
-- ----------------------------------------------------------------------------
--
-- It would be tempting to gate reads of, say, the relationships table on
-- the user having the 'network' module entitled. Resist. Module
-- entitlements are about which TAB renders — when a buyer without the
-- network entitlement clicks the Network tab, the LockedModule upsell
-- renders instead of the live tool. The live tool, when allowed, fetches
-- the same underlying data as Map / List / Directory. Splitting "which
-- rows exist" from "which surfaces render" keeps the policy file simple
-- and avoids a thicket where tightening a policy silently breaks the Map
-- because the buyer with map-only access actually needs relationships
-- data to draw connection lines.
--
-- ----------------------------------------------------------------------------
-- FUTURE: REGIONAL TENANCY
-- ----------------------------------------------------------------------------
--
-- When Provender expands beyond Louisville/Kentuckiana to multiple
-- regions, this file gets a region scope: each user_profiles row gains a
-- region_id, and each entity table's policy filters via county_fips ↔
-- region.fips_codes. That's a follow-up — until there are two regions in
-- one project, every authed tenant sees the full set.
--
-- ----------------------------------------------------------------------------
-- IDEMPOTENT
-- ----------------------------------------------------------------------------
-- Re-running this file is safe: each policy is dropped before recreate,
-- ENABLE ROW LEVEL SECURITY is no-op if already on. Demo's "anon read"
-- policy is defensively dropped if present.


-- ============================================================================
-- 1. THE TABLES THIS FILE GOVERNS
-- ============================================================================
--
-- Centralised so the loop below stays readable and so adding a new entity
-- table is a one-line change. Auth tables (user_profiles,
-- user_module_entitlements) are intentionally excluded — they're already
-- governed by stricter "owner only" policies in 008.

DO $$
DECLARE
  t   text;
  tables text[] := ARRAY[
    'farms',
    'markets',
    'distributors',
    'processors',
    'recovery_nodes',
    'enablers',
    'regions',
    'persons',
    'farm_crops',
    'relationships'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Confirm the table actually exists in this project before touching it.
    -- If a table is missing, NOTICE and skip — easier to triage than a
    -- hard failure halfway through a migration that leaves the project
    -- partially-policied.
    IF NOT EXISTS (
      SELECT 1 FROM pg_tables
      WHERE schemaname = 'public' AND tablename = t
    ) THEN
      RAISE NOTICE 'Skipped public.% — table not found in this project', t;
      CONTINUE;
    END IF;

    -- Defensive: drop the demo's open-read policy if it ever leaked into
    -- this project. Real-build should never have it; this is belt-and-
    -- suspenders so a misapplied demo migration can't leave the door open
    -- after this file runs.
    EXECUTE format('DROP POLICY IF EXISTS "anon read" ON public.%I', t);

    -- Drop and recreate the tenant-read policy so re-runs pick up any
    -- edits to the USING clause without manual cleanup.
    EXECUTE format('DROP POLICY IF EXISTS "tenant read" ON public.%I', t);

    EXECUTE format(
      'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t
    );

    EXECUTE format(
      'CREATE POLICY "tenant read" ON public.%I '
      'FOR SELECT TO authenticated USING (true)', t
    );
  END LOOP;
END $$;


-- ============================================================================
-- 2. VIEW: v_document_status
-- ============================================================================
--
-- Postgres views don't have their own RLS policies — they inherit from the
-- underlying tables. PG 15+ supports `security_invoker = true` on views,
-- which makes the view honour the calling user's RLS instead of the
-- view-owner's. Provender's Supabase project runs PG 15+, so:
--
--   ALTER VIEW public.v_document_status SET (security_invoker = true);
--
-- Confirm whichever underlying table v_document_status reads from
-- (likely `documents` or a join across documents + node_*) has its own
-- "tenant read" policy via the loop above OR is added to the tables
-- array. The line below is commented out because we haven't confirmed
-- this view exists in the real-build project yet — uncomment after
-- verifying. If it doesn't exist there at all (the view may be demo-only),
-- delete this section.
--
-- ALTER VIEW public.v_document_status SET (security_invoker = true);


-- ============================================================================
-- 3. SANITY CHECKS
-- ============================================================================
--
-- After applying, verify policies are in place. Run these in the SQL
-- editor and eyeball:
--
--   SELECT tablename,
--          rowsecurity AS rls_enabled,
--          (SELECT count(*) FROM pg_policies p
--             WHERE p.schemaname = t.schemaname
--               AND p.tablename = t.tablename) AS policy_count
--   FROM pg_tables t
--   WHERE schemaname = 'public'
--     AND tablename IN (
--       'farms','markets','distributors','processors',
--       'recovery_nodes','enablers','regions','persons',
--       'farm_crops','relationships'
--     )
--   ORDER BY tablename;
--
-- Expected: every row has rls_enabled = true and policy_count = 1.
--
-- Then: open a private browser window, hit the live site without signing
-- in, and confirm the explorer is empty (no farms, no markets, etc.). If
-- you see data while logged out, RLS is not engaged — investigate before
-- shipping further.
