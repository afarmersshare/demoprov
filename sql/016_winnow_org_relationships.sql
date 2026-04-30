-- 016_winnow_org_relationships.sql
-- Phase 8 (WINNOW): partner relationships — orgs AFS can co-apply with,
-- be fiscally sponsored by, or reach via warm intro. The anchor nodes for
-- the warm-intro graph the foundation matcher will eventually traverse.
--
-- Why this is its own table (not jsonb on winnow_org_profile):
--   * Each row gets queried by the matcher when scoring opportunities
--     (e.g. "this LFPP grant requires 501(c)(3); does AFS have an active
--     co-applicant partner with the right geography?"). Querying jsonb
--     for that case-by-case is awkward; relational is cleaner.
--   * Partners are added/removed independently of the org profile and
--     should be edit-tracked (created_at, updated_at) per row.
--
-- Apply order: after 015_winnow_org_profile.sql.
-- Idempotent: enum guarded; table IF NOT EXISTS; trigger DROP+CREATE;
-- policies DROP+CREATE; seed INSERT … ON CONFLICT DO NOTHING.


-- ============================================================================
-- 1. ENUMS
-- ============================================================================
--
-- relationship_kind is what the matcher cares about most:
--   co_applicant_partner  — AFS can submit grants jointly with this org
--                           (most useful for federal grants requiring 501c3
--                           when AFS as a PBC isn't directly eligible).
--   fiscal_sponsor        — formal fiscal sponsorship arrangement.
--   advisor               — Advisory Council member or external advisor.
--   board                 — Board of Directors member.
--   alumni_grantee        — org has previously received funding alongside
--                           or via AFS-related work; useful warm-intro path.
--   warm_intro_path       — known relationship usable for foundation intros.
--   funder_prior          — funder that has previously funded AFS.
--   client                — AFS consulting client (revealing AFS network depth).
--   coalition             — coalition or network membership (e.g. CalCAN-style).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'winnow_partner_type_t') THEN
    CREATE TYPE public.winnow_partner_type_t AS ENUM (
      'nonprofit_501c3',
      'foundation',
      'fiscal_sponsor',
      'university',
      'government',
      'cdfi',
      'cooperative',
      'for_profit',
      'individual',
      'tribal',
      'coalition',
      'other'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'winnow_relationship_kind_t') THEN
    CREATE TYPE public.winnow_relationship_kind_t AS ENUM (
      'co_applicant_partner',
      'fiscal_sponsor',
      'advisor',
      'board',
      'alumni_grantee',
      'warm_intro_path',
      'funder_prior',
      'client',
      'coalition'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'winnow_relationship_status_t') THEN
    CREATE TYPE public.winnow_relationship_status_t AS ENUM (
      'active',
      'prospective',
      'former'
    );
  END IF;
END $$;


-- ============================================================================
-- 2. TABLE: winnow_org_relationships
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.winnow_org_relationships (
  id                  uuid                                  PRIMARY KEY DEFAULT gen_random_uuid(),
  org_slug            text                                  NOT NULL REFERENCES public.winnow_org_profile(slug) ON DELETE CASCADE,
  partner_name        text                                  NOT NULL,
  partner_type        public.winnow_partner_type_t          NOT NULL,
  relationship_kind   public.winnow_relationship_kind_t     NOT NULL,
  status              public.winnow_relationship_status_t   NOT NULL DEFAULT 'active',
  state              text,                                            -- 2-letter state code, NULL if multi-state or non-US
  ein                 text,                                            -- Employer ID Number, when known; enables 990 lookup
  website             text,
  contact_name        text,
  contact_email       text,
  contact_phone       text,
  mission_tags        text[]                                NOT NULL DEFAULT '{}',  -- partner's own focus areas; the matcher overlaps these against opportunity tags
  notes               text,
  created_at          timestamptz                           NOT NULL DEFAULT now(),
  updated_at          timestamptz                           NOT NULL DEFAULT now(),
  -- Soft uniqueness: same partner can have multiple relationship kinds
  -- (a foundation can be both warm_intro_path and funder_prior), so we key
  -- on the (org, partner, kind) triple.
  UNIQUE (org_slug, partner_name, relationship_kind)
);

COMMENT ON TABLE public.winnow_org_relationships IS
  'Partner orgs AFS can co-apply with, be fiscally sponsored by, or reach via warm intro. Anchor nodes for the foundation warm-intro graph. One row per (org, partner, relationship_kind) — a single partner can hold multiple relationship kinds (e.g. both warm_intro_path and funder_prior).';

COMMENT ON COLUMN public.winnow_org_relationships.ein IS
  'Employer Identification Number when known. Enables direct lookup against IRS 990 data and ProPublica Nonprofit Explorer for ground-truth grant history.';

COMMENT ON COLUMN public.winnow_org_relationships.mission_tags IS
  'Partner''s own focus areas, used by the matcher: an LFPP opportunity scores higher when AFS has a co_applicant_partner whose mission_tags overlap the opportunity''s eligibility tags.';

CREATE INDEX IF NOT EXISTS winnow_org_relationships_org_kind_idx
  ON public.winnow_org_relationships (org_slug, relationship_kind);

CREATE INDEX IF NOT EXISTS winnow_org_relationships_state_idx
  ON public.winnow_org_relationships (state)
  WHERE state IS NOT NULL;

CREATE INDEX IF NOT EXISTS winnow_org_relationships_ein_idx
  ON public.winnow_org_relationships (ein)
  WHERE ein IS NOT NULL;


-- ============================================================================
-- 3. UPDATED_AT TRIGGER
-- ============================================================================

DROP TRIGGER IF EXISTS winnow_org_relationships_touch_updated_at ON public.winnow_org_relationships;
CREATE TRIGGER winnow_org_relationships_touch_updated_at
  BEFORE UPDATE ON public.winnow_org_relationships
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


-- ============================================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================================
-- Same pattern as winnow_org_profile (015): afs_internal SELECT/INSERT/UPDATE.
-- DELETE is service-role only.

ALTER TABLE public.winnow_org_relationships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "afs_internal reads relationships" ON public.winnow_org_relationships;
CREATE POLICY "afs_internal reads relationships"
  ON public.winnow_org_relationships
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid() AND up.tier = 'afs_internal'
    )
  );

DROP POLICY IF EXISTS "afs_internal writes relationships" ON public.winnow_org_relationships;
CREATE POLICY "afs_internal writes relationships"
  ON public.winnow_org_relationships
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid() AND up.tier = 'afs_internal'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid() AND up.tier = 'afs_internal'
    )
  );

DROP POLICY IF EXISTS "afs_internal inserts relationships" ON public.winnow_org_relationships;
CREATE POLICY "afs_internal inserts relationships"
  ON public.winnow_org_relationships
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid() AND up.tier = 'afs_internal'
    )
  );


-- ============================================================================
-- 5. SEED: AFS confirmed partners
-- ============================================================================
--
-- User-confirmed in-session (2026-04-30):
--   * Feed Louisville (KY) — co-applicant partner, active
--   * EARTH Foundation, part of SAFE Sylacauga (AL) — co-applicant partner, active
--   * Stone Barns Center (NY) — co-applicant partner candidate, prospective
--
-- All three are 501(c)(3) nonprofits, addressing the AFS PBC's pass-through
-- need for federal grants requiring 501(c)(3) status (LFPP, CFPCGP, etc.)
-- until AFS launches its own 501(c)(3) arm in Q3 2026.
--
-- EIN values are NULL where not yet confirmed; populate via /winnow/onboarding
-- to enable 990 lookup against ProPublica Nonprofit Explorer.

INSERT INTO public.winnow_org_relationships (
  org_slug, partner_name, partner_type, relationship_kind, status, state,
  mission_tags, notes
) VALUES
  (
    'afs',
    'Feed Louisville',
    'nonprofit_501c3',
    'co_applicant_partner',
    'active',
    'KY',
    ARRAY['food_access', 'food_recovery', 'urban_food_systems', 'mutual_aid', 'food_justice'],
    'Louisville-based 501(c)(3); active co-applicant relationship for KY-eligible federal grants. Provender already maps Feed Louisville-style recovery flows; alignment with AFS''s urban food access and circular-economy work.'
  ),
  (
    'afs',
    'EARTH Foundation (SAFE Sylacauga)',
    'nonprofit_501c3',
    'co_applicant_partner',
    'active',
    'AL',
    ARRAY['rural_food_systems', 'community_development', 'small_farm_support', 'southeast_food_systems'],
    'Alabama-based; part of SAFE Sylacauga. Active co-applicant for AL-eligible federal grants. Anchors the Southeast geography for AFS''s Phase 2 expansion.'
  ),
  (
    'afs',
    'Stone Barns Center for Food and Agriculture',
    'nonprofit_501c3',
    'co_applicant_partner',
    'prospective',
    'NY',
    ARRAY['regenerative_agriculture', 'farmer_training', 'food_systems_education', 'northeast_food_systems', 'agroecology'],
    'Pokantico Hills, NY. Prospective co-applicant for NY-eligible federal grants (CFPCGP, NE-SARE) and Northeast aggregation work. Warm-intro outreach to confirm partnership status.'
  )
ON CONFLICT (org_slug, partner_name, relationship_kind) DO NOTHING;
