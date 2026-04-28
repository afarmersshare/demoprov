-- 013_module_landing.sql
-- Phase 7 follow-up to w_tier_matrix_apply: introduces 'landing' as a tenth
-- entitleable module slug.
--
-- Why a separate migration: 008 is already applied to demo Supabase; the
-- CHECK constraint on user_module_entitlements is the source of truth for
-- legal slugs and needs a DROP+ADD to widen. Function bodies (default_modules_for_tier)
-- live in 010 and are CREATE OR REPLACE — those are edited in place when the
-- matrix changes.
--
-- Apply order:
--   1. Run this file (013) — widens the CHECK to allow 'landing'.
--   2. Re-run 010 — installs the updated default_modules_for_tier.
--   3. (Optional) From the SQL editor:
--        SELECT public.seed_default_entitlements_for_all();
--      Adds the missing 'landing' (and any other) rows to existing users.
--      Idempotent. Never revokes manual unlocks — to pull a user back to the
--      strict matrix, delete their rows manually before re-seeding.

ALTER TABLE public.user_module_entitlements
  DROP CONSTRAINT IF EXISTS user_module_entitlements_slug_chk;

ALTER TABLE public.user_module_entitlements
  ADD CONSTRAINT user_module_entitlements_slug_chk
  CHECK (module_slug IN (
    'landing',
    'map',
    'network',
    'flows',
    'list',
    'directory',
    'county',
    'dashboard',
    'pipeline',
    'reports'
  ));

COMMENT ON CONSTRAINT user_module_entitlements_slug_chk
  ON public.user_module_entitlements IS
  'Canonical module slug list. Mirror in src/lib/auth/get-user.ts ModuleSlug union and TAB_ORDER in network-explorer.tsx. Update in lockstep.';
