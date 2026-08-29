-- 014_winnow_module_slug.sql
-- Phase 8 (WINNOW — AFS Funding Discovery System): introduces 'winnow' as
-- the eleventh entitleable module slug. WINNOW is the internal ops tool
-- that ingests funding opportunities (federal grants, foundation 990-PFs,
-- private-placement signal, news) and surfaces them ranked-but-never-hidden
-- against an AFS profile.
--
-- Why a separate migration (matches 013's pattern):
--   008 + 013 are the source of truth for the CHECK constraint on
--   user_module_entitlements. Adding a new slug requires DROP+ADD on the
--   constraint. Function bodies (default_modules_for_tier) live in 010 and
--   are CREATE OR REPLACE — those get edited in place when the tier matrix
--   changes.
--
-- Apply order:
--   1. Run this file (014) — widens the CHECK to allow 'winnow'.
--   2. Re-run 010 — installs the updated default_modules_for_tier (which
--      grants 'winnow' to afs_internal only — it's an internal ops tool,
--      not a tenant-facing surface).
--   3. Run 015_winnow_schema.sql — creates the WINNOW tables + policies.
--   4. (Optional) From the SQL editor:
--        SELECT public.seed_default_entitlements_for_all();
--      Adds the 'winnow' entitlement row to existing afs_internal users.
--
-- Mirror in lockstep (same as the comment on the constraint):
--   - src/lib/auth/get-user.ts — ModuleSlug union
--   - src/app/profile/page.tsx — ALL_MODULE_SLUGS + MODULE_LABEL
--   - src/components/farms/network-explorer.tsx — TAB_ORDER (only if
--     WINNOW eventually surfaces as a tab there; current plan is a
--     standalone /winnow route group, so TAB_ORDER does NOT need updating).

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
    'reports',
    'winnow'
  ));

COMMENT ON CONSTRAINT user_module_entitlements_slug_chk
  ON public.user_module_entitlements IS
  'Canonical module slug list. Mirror in src/lib/auth/get-user.ts ModuleSlug union, ALL_MODULE_SLUGS in src/app/profile/page.tsx, and (when applicable) TAB_ORDER in network-explorer.tsx. Update in lockstep. winnow is the AFS-internal funding-discovery tool, gated to afs_internal tier only.';
