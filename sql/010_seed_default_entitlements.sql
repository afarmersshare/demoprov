-- 010_seed_default_entitlements.sql
-- Phase 7 follow-up: lift the tier → module matrix from the proposal comment
-- in 008_auth_users.sql lines 181–267 into an executable helper function.
--
-- Adds:
--   1. public.default_modules_for_tier(tier_t)  — pure function returning
--      the canonical module_slug[] for a given tier.
--   2. public.seed_default_entitlements(uuid)   — given a user_id, looks up
--      the user's tier and inserts the matching rows into
--      user_module_entitlements (ON CONFLICT DO NOTHING).
--   3. public.seed_default_entitlements_for_all() — bulk-apply helper for
--      backfilling existing accounts. Returns a count of users touched.
--
-- Idempotent. CREATE OR REPLACE everywhere; INSERT … ON CONFLICT DO NOTHING.
-- Calling these functions does NOT overwrite manual entitlement adjustments
-- — it only ADDS missing default rows for the user's tier.
--
-- IMPORTANT: this file does NOT auto-run a backfill at the bottom. If you
-- want every existing user to get their tier defaults, run
--   SELECT public.seed_default_entitlements_for_all();
-- once from the SQL editor after applying this migration.
--
-- Matrix source of truth: 008_auth_users.sql comment block (lines 181–267).
-- Any change here should be mirrored back into that comment so the rationale
-- stays adjacent to the data.


-- ============================================================================
-- 1. PURE LOOKUP — tier → module_slug[]
-- ============================================================================

CREATE OR REPLACE FUNCTION public.default_modules_for_tier(p_tier public.tier_t)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  -- Locked 2026-04-28. Source of truth: project_tier_modules_matrix.md
  -- (Kelsey's memory). Six top-level tabs: Landing · Map · Directory (List,
  -- By county nested) · Network (Flows nested) · Dashboard · Reports —
  -- plus Pipeline gated to afs_internal.
  --
  -- Operator personas (farmer, buyer, hub) get Landing instead of Dashboard.
  -- Observer personas (government, nonprofit, funder, aggregator, afs) get
  -- both Landing and Dashboard. demo (universal free) gets Map + Dashboard
  -- only — it's the unconnected-visitor floor; signed-in operators upgrade
  -- past it. farmer_free is deprecated and collapses to the demo set
  -- (enum value retained for migration safety).
  SELECT CASE p_tier
    WHEN 'demo'                THEN ARRAY['map','dashboard']
    WHEN 'farmer_free'         THEN ARRAY['map','dashboard']
    WHEN 'farmer_paid'         THEN ARRAY['landing','map','directory','list','county','network','flows','reports']
    WHEN 'buyer_institutional' THEN ARRAY['landing','map','directory','list','county','network','flows','reports']
    WHEN 'buyer_grocery'       THEN ARRAY['landing','map','directory','list','county','network','flows','reports']
    WHEN 'buyer_foodservice'   THEN ARRAY['landing','map','directory','list','county','network','flows','reports']
    WHEN 'buyer_farmersmarket' THEN ARRAY['landing','map','directory','list','county','network','flows','reports']
    WHEN 'buyer_processor'     THEN ARRAY['landing','map','directory','list','county','network','flows','reports']
    WHEN 'buyer_foodhub'       THEN ARRAY['landing','map','directory','list','county','network','flows','reports']
    WHEN 'government'          THEN ARRAY['landing','map','directory','list','county','network','flows','dashboard','reports']
    WHEN 'nonprofit'           THEN ARRAY['landing','map','directory','list','county','network','flows','dashboard','reports']
    WHEN 'funder'              THEN ARRAY['landing','map','directory','list','county','network','flows','dashboard','reports']
    WHEN 'aggregator_licensed' THEN ARRAY['landing','map','directory','list','county','network','flows','dashboard','pipeline','reports']
    WHEN 'afs_internal'        THEN ARRAY['landing','map','directory','list','county','network','flows','dashboard','pipeline','reports']
  END;
$$;

COMMENT ON FUNCTION public.default_modules_for_tier(public.tier_t) IS
  'Canonical tier → modules mapping. Pure — does not read any rows. Locked 2026-04-28; source of truth is project_tier_modules_matrix.md in Kelsey memory. The proposed-matrix block in 008_auth_users.sql (lines 181–267) is the original draft and is now historical.';


-- ============================================================================
-- 2. SEED ONE USER
-- ============================================================================
--
-- Looks up the user's current tier from user_profiles, then inserts the
-- matching default module rows. Uses ON CONFLICT DO NOTHING so it's safe to
-- call repeatedly and never clobbers manual unlocks.
--
-- Returns the number of rows actually inserted (0 if everything was already
-- in place, or if the user_id wasn't found).

CREATE OR REPLACE FUNCTION public.seed_default_entitlements(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier    public.tier_t;
  v_slugs   text[];
  v_added   integer := 0;
BEGIN
  SELECT tier INTO v_tier
  FROM public.user_profiles
  WHERE user_id = p_user_id;

  IF v_tier IS NULL THEN
    RETURN 0;
  END IF;

  v_slugs := public.default_modules_for_tier(v_tier);
  IF v_slugs IS NULL THEN
    RETURN 0;
  END IF;

  WITH ins AS (
    INSERT INTO public.user_module_entitlements (user_id, module_slug)
    SELECT p_user_id, slug FROM unnest(v_slugs) AS slug
    ON CONFLICT (user_id, module_slug) DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO v_added FROM ins;

  RETURN v_added;
END;
$$;

COMMENT ON FUNCTION public.seed_default_entitlements(uuid) IS
  'Adds (idempotently) the default module entitlements for a user, based on their current user_profiles.tier. Never deletes or overwrites manual rows.';


-- ============================================================================
-- 3. BULK BACKFILL
-- ============================================================================
--
-- Walks every row in user_profiles and seeds defaults for each. Useful as a
-- one-shot when applying this migration to an existing project, or after a
-- tier change to mass-resync rows. Returns the total number of inserted
-- entitlement rows across all users.

CREATE OR REPLACE FUNCTION public.seed_default_entitlements_for_all()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r       record;
  v_total integer := 0;
BEGIN
  FOR r IN SELECT user_id FROM public.user_profiles LOOP
    v_total := v_total + public.seed_default_entitlements(r.user_id);
  END LOOP;
  RETURN v_total;
END;
$$;

COMMENT ON FUNCTION public.seed_default_entitlements_for_all() IS
  'Bulk wrapper: runs seed_default_entitlements for every existing user_profiles row. Returns total rows inserted. Safe to re-run.';


-- ============================================================================
-- 4. AUTO-SEED ON USER CREATION
-- ============================================================================
--
-- When the auto-provision trigger in 008_auth_users.sql inserts a fresh
-- user_profiles row at (tier=demo, persona=explore), this trigger then seeds
-- the matching demo entitlements. Post-2026-04-28 matrix lock, that means
-- Map + Dashboard only — the unconnected-visitor floor. Anonymous URL-param
-- visitors bypass entitlements entirely (network-explorer.tsx treats undefined
-- as "all tabs unlocked"), so the public sales-demo flow is unaffected.
--
-- Fires AFTER INSERT on user_profiles so it sees the row that triggered it.
-- An admin tier change later (e.g. demo → farmer_free) does NOT re-seed —
-- those changes go through the admin tooling that calls
-- seed_default_entitlements explicitly.

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_default_entitlements(NEW.user_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_user_profile_created ON public.user_profiles;
CREATE TRIGGER on_user_profile_created
  AFTER INSERT ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();
