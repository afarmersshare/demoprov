-- 008_auth_users.sql
-- Phase 7: authentication + per-user persona + module-entitlement model.
-- Applies to BOTH demo and real-build projects
-- (per project_demo_pivot_back_rules.md — auth schema is real-build relevant,
-- so this lives in sql/ not sql/demo_seeds/).
--
-- Creates:
--   1. tier_t enum   — pricing tiers per Remy's four-persona framework (April 2026).
--   2. persona_t enum — runtime UX persona (matches the Persona union in
--                       src/components/farms/network-explorer.tsx).
--   3. public.user_profiles               — one row per auth.users record.
--   4. public.user_module_entitlements    — link table user_id ↔ tab-key slug.
--   5. touch_updated_at()                 — generic updated_at trigger fn.
--   6. handle_new_auth_user()             — auto-creates a user_profiles row
--                                           at (tier=demo, persona=explore)
--                                           when Supabase Auth inserts a user.
--   7. RLS policies                       — owner-only read on both tables;
--                                           owner update on user_profiles.
--                                           Writes to tier/entitlements happen
--                                           via service-role key (bypasses RLS).
--
-- Idempotent: enums are guarded; tables use IF NOT EXISTS; functions use
-- CREATE OR REPLACE; policies and triggers are dropped before recreation.
--
-- First applied: TBD


-- ============================================================================
-- 1. ENUMS
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tier_t') THEN
    CREATE TYPE public.tier_t AS ENUM (
      'farmer_free',
      'farmer_paid',
      'buyer_institutional',
      'buyer_foodhub',
      'buyer_grocery',
      'buyer_foodservice',
      'buyer_farmersmarket',
      'buyer_processor',
      'government',
      'nonprofit',
      'funder',
      'aggregator_licensed',
      'afs_internal',
      'demo'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'persona_t') THEN
    CREATE TYPE public.persona_t AS ENUM (
      'farmer',
      'buyer',
      'policymaker',
      'nonprofit',
      'funder',
      'afs',
      'explore'
    );
  END IF;
END $$;


-- ============================================================================
-- 2. TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id       uuid              PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tier          public.tier_t     NOT NULL DEFAULT 'demo',
  persona       public.persona_t  NOT NULL DEFAULT 'explore',
  display_name  text,
  created_at    timestamptz       NOT NULL DEFAULT now(),
  updated_at    timestamptz       NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_profiles IS
  'One row per auth.users. tier = what they pay for (Remy''s pricing framework). persona = which dashboard they see. The two are independent — e.g. all buyer_* tiers map to persona=buyer; government tier maps to persona=policymaker; funder tier to persona=funder.';
COMMENT ON COLUMN public.user_profiles.tier IS
  'Pricing tier — drives default module entitlements and locked-module upsell copy.';
COMMENT ON COLUMN public.user_profiles.persona IS
  'Runtime UX persona — drives default tab and dashboard layout. Each persona has its own dashboard (no aliasing): farmer, buyer, policymaker (government), nonprofit, funder (foundations/researchers), afs (admin), explore (default landing).';

CREATE TABLE IF NOT EXISTS public.user_module_entitlements (
  user_id      uuid         NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
  module_slug  text         NOT NULL,
  granted_at   timestamptz  NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, module_slug),
  CONSTRAINT user_module_entitlements_slug_chk
    CHECK (module_slug IN ('map','network','flows','list','directory','county','dashboard','pipeline','reports'))
);

COMMENT ON TABLE public.user_module_entitlements IS
  'Per-user module unlocks. Row present = live tool renders for that tab. No row = locked-module upsell panel renders. Slugs match network-explorer.tsx tab keys exactly.';


-- ============================================================================
-- 3. UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_profiles_touch_updated_at ON public.user_profiles;
CREATE TRIGGER user_profiles_touch_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


-- ============================================================================
-- 4. AUTO-PROVISION user_profiles ROW ON SIGNUP
-- ============================================================================
-- Without this, the first server-side query for the user's profile after
-- signup returns no rows and the page 500s. The trigger fires on auth.users
-- INSERT and ensures every authenticated user has a profile to read.

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, tier, persona)
  VALUES (NEW.id, 'demo', 'explore')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();


-- ============================================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.user_profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_module_entitlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user reads own profile" ON public.user_profiles;
CREATE POLICY "user reads own profile"
  ON public.user_profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user updates own profile" ON public.user_profiles;
CREATE POLICY "user updates own profile"
  ON public.user_profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user reads own entitlements" ON public.user_module_entitlements;
CREATE POLICY "user reads own entitlements"
  ON public.user_module_entitlements
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policy on user_module_entitlements for the
-- authenticated role: entitlement changes happen via the service-role key
-- from Kelsey's admin tooling, which bypasses RLS by design.


-- ============================================================================
-- 6. PROPOSED DEFAULT TIER → MODULE MATRIX (FOR KELSEY REVIEW)
-- ============================================================================
--
-- NOT applied as part of this migration. One row per tier — no grouping —
-- so any tier can be hand-edited without affecting the rest. Read, adjust,
-- then either lift into a helper function (seed_default_entitlements) called
-- by the admin UI, or hand-seed once via the SQL editor.
--
-- Principles baked into this matrix:
--   · `reports` is universal — every tier sees the tab; the reports inside
--     differ per persona (farmer reports ≠ buyer reports ≠ funder reports).
--   · `pipeline` is AFS-internal only — never granted to tenants.
--   · `flows` and `county` are aggregate analytics, granted to actors who
--     think regionally — buyers, government, funders, and nonprofits doing
--     circular-economy work (e.g. Feed Louisville sourcing from farms +
--     routing food-waste recovery through the network).
--   · Cheaper tiers start lean — easier to upsell into a visible locked tab
--     than to revoke a tab a paying customer has been using.
--
-- Per-tier reasoning:
--
--   farmer_free           → map, directory, reports
--                           (Tier 1 freemium: profile + buyers within radius
--                           + a basic farmer-scoped report (views, listings,
--                           audience reach). Upgrade triggers live in locked
--                           network and dashboard.)
--
--   farmer_paid           → map, directory, network, dashboard, reports
--                           (+ competitor toggle, eligibility scoring,
--                           buyer-contact unlocks. Flows/county stay locked —
--                           those are aggregate views, not single-farm tools.
--                           No pipeline — AFS-internal.)
--
--   buyer_institutional   → map, network, flows, list, directory,
--                           county, dashboard, reports
--                           (full Tier 2 surface — highest-budget buyer tier.)
--
--   buyer_foodhub         → map, network, flows, list, directory,
--                           county, dashboard, reports
--                           (aggregators run their own networks — flows +
--                           county are core to how they operate.)
--
--   buyer_grocery         → map, network, flows, list, directory,
--                           county, dashboard, reports
--                           (retail procurement: full visibility.)
--
--   buyer_foodservice     → map, network, list, directory, dashboard, reports
--                           (tactical not strategic — flows + county locked,
--                           drives upgrade conversation toward foodhub.)
--
--   buyer_farmersmarket   → map, directory, list, dashboard, reports
--                           (cheapest buyer tier $1.5K–$4K — most surface
--                           locked, lots of upsell room.)
--
--   buyer_processor       → map, network, flows, list, directory,
--                           county, dashboard, reports
--                           (flow data is the heart of processor workflows.)
--
--   government            → map, flows, county, dashboard, reports
--                           (population-scale: regional/county aggregates.
--                           No network/list/directory — those are actor-level
--                           and not how a government user thinks.)
--
--   nonprofit             → map, network, flows, list, directory, dashboard, reports
--                           (advocacy + outreach + relationship work +
--                           circular-economy flows. Feed Louisville-type orgs
--                           source from farms and care most about food-waste
--                           recovery routed through the network. No county —
--                           that's a gov-level aggregate view.)
--
--   funder                → map, flows, county, dashboard, reports
--                           (outcomes + MMRV + impact at scale.
--                           No directory/list/network — funders don't manage
--                           per-actor relationships, they fund the system.)
--
--   aggregator_licensed   → all 9 modules
--   afs_internal          → all 9 modules  (Kelsey's admin path.)
--   demo                  → all 9 modules  (prospect trial: full pitch surface.)
--
--
-- Example one-shot seed (DO NOT RUN as part of this migration):
--
--   INSERT INTO public.user_module_entitlements (user_id, module_slug)
--   SELECT '<auth-user-uuid>', slug
--   FROM unnest(ARRAY['map','directory']) AS slug
--   ON CONFLICT DO NOTHING;
