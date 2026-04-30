-- 015_winnow_org_profile.sql
-- Phase 8 (WINNOW): the AFS profile — the single declarative source of
-- "what AFS is" that drives every funder match the rest of WINNOW computes.
--
-- Singleton-by-convention: the table is keyed by a text slug ('afs') instead
-- of user_id. There is one canonical AFS profile, edited collaboratively by
-- afs_internal team members, not a per-user copy. The schema leaves room for
-- additional org slugs (e.g. if WINNOW ever serves a partner org) without
-- restructuring; today there is exactly one row.
--
-- Apply order:
--   1. 014_winnow_module_slug.sql           (slug CHECK widened)
--   2. 010_seed_default_entitlements.sql    (re-run; matrix grants 'winnow')
--   3. THIS FILE (015_winnow_org_profile.sql)
--   4. 016+                                 (sources, raw_documents,
--                                            funders, opportunities, etc.)
--
-- Idempotent. Enums guarded; tables IF NOT EXISTS; trigger DROP+CREATE;
-- policy DROP+CREATE; seed INSERT … ON CONFLICT DO NOTHING.
--
-- Why this ships before the ingestion tables: AFS profile + onboarding form
-- is the only user-input surface in WINNOW (per "I don't want to type
-- anything in" — this is the agreed exception). Getting it persistent and
-- editable end-to-end validates the auth/route plumbing before we wire any
-- of the heavier ingestion machinery.


-- ============================================================================
-- 1. ENUMS
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'winnow_entity_type_t') THEN
    CREATE TYPE public.winnow_entity_type_t AS ENUM (
      'pbc',                  -- Public Benefit Corporation (AFS today)
      'b_corp_certified',     -- B Lab certified (AFS goal)
      'llc',
      'c_corp',
      's_corp',
      'nonprofit_501c3',
      'fiscally_sponsored',   -- operating under a 501c3 sponsor
      'sole_prop',
      'cooperative',
      'government',
      'tribal'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'winnow_b_corp_status_t') THEN
    CREATE TYPE public.winnow_b_corp_status_t AS ENUM (
      'none',
      'pending_assessment',   -- AFS today: working through B Impact Assessment
      'certified',
      'recertified'
    );
  END IF;
END $$;


-- ============================================================================
-- 2. TABLE: winnow_org_profile
-- ============================================================================
--
-- One row per organization. AFS is the singleton ('afs').
--
-- Field design notes:
--   * leadership_attributes is text[] (not enum) so we can extend without a
--     migration when a new funder priority emerges (e.g. 'disability_led').
--     Common values used by the matcher: women_led, bipoc_led, veteran_led,
--     lgbtq_led, immigrant_led, disability_led, indigenous_led, youth_led.
--   * service_lines maps to AFS's ACRE pillars but stays text[] for the same
--     reason. Canonical values: advising, commons_lab, blueprint_reservoir,
--     engagement_collective.
--   * mission_tags is the broad bag of words the matcher embeds against
--     funder priority statements. Aim for ~20–40 tags, kept human-readable.
--   * geography_focus uses uppercase strings: 'USA' for nationwide, 2-letter
--     state codes ('KY', 'AL', 'NY') for state-level focus, region codes
--     ('SOUTHEAST', 'NORTHEAST') for multi-state. The matcher unions these.
--   * ask_size_min_usd / max_usd bound what AFS will actually pursue. NULL
--     max means "no ceiling." Matcher uses these to mark opportunities as
--     too-small or too-big, but never hides them.
--   * founders is jsonb (not a normalized table) because it's read-mostly,
--     small, and rarely queried by member name. Shape:
--       [{ "name": "...", "title": "...", "focus": "..." }, ...]

CREATE TABLE IF NOT EXISTS public.winnow_org_profile (
  slug                    text                              PRIMARY KEY,
  legal_name              text                              NOT NULL,
  dba_name                text,
  entity_type             public.winnow_entity_type_t       NOT NULL,
  b_corp_status           public.winnow_b_corp_status_t     NOT NULL DEFAULT 'none',
  state_of_incorporation  text,                                       -- 2-letter
  foreign_registrations   text[]                            NOT NULL DEFAULT '{}',
  founded_date            date,
  leadership_attributes   text[]                            NOT NULL DEFAULT '{}',
  service_lines           text[]                            NOT NULL DEFAULT '{}',
  mission_statement       text,
  vision_statement        text,
  geography_focus         text[]                            NOT NULL DEFAULT '{}',
  ask_size_min_usd        integer,
  ask_size_max_usd        integer,
  mission_tags            text[]                            NOT NULL DEFAULT '{}',
  domain_expertise        text[]                            NOT NULL DEFAULT '{}',
  revenue_streams         text[]                            NOT NULL DEFAULT '{}',
  founders                jsonb                             NOT NULL DEFAULT '[]'::jsonb,
  website                 text,
  primary_email           text,
  notes                   text,
  created_at              timestamptz                       NOT NULL DEFAULT now(),
  updated_at              timestamptz                       NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.winnow_org_profile IS
  'Singleton-by-convention org profile keyed by slug. One row per organization; AFS is the ''afs'' row. Drives all WINNOW funder matching. Editable end-to-end via /winnow/onboarding by users with the afs_internal tier. Adding a new field here means updating the onboarding form and the matcher in lockstep.';

COMMENT ON COLUMN public.winnow_org_profile.leadership_attributes IS
  'Funder-relevant leadership tags (women_led, bipoc_led, etc.). text[] not enum so new tags don''t require a migration when a funder priority emerges.';

COMMENT ON COLUMN public.winnow_org_profile.service_lines IS
  'ACRE pillar slugs: advising, commons_lab, blueprint_reservoir, engagement_collective. Per-pillar matching lives in winnow_program_areas (later migration); this column is the coarse top-level filter.';

COMMENT ON COLUMN public.winnow_org_profile.geography_focus IS
  'Geography codes: USA for nationwide, 2-letter state codes for state-level, region codes (SOUTHEAST, NORTHEAST, MIDWEST, WEST, SOUTH) for multi-state. Matcher unions these.';

COMMENT ON COLUMN public.winnow_org_profile.ask_size_min_usd IS
  'Smallest opportunity size AFS will pursue. Used to flag (NOT hide) too-small opportunities. AFS today = $1,000.';


-- ============================================================================
-- 3. UPDATED_AT TRIGGER
-- ============================================================================
-- Reuses public.touch_updated_at() defined in 008_auth_users.sql.

DROP TRIGGER IF EXISTS winnow_org_profile_touch_updated_at ON public.winnow_org_profile;
CREATE TRIGGER winnow_org_profile_touch_updated_at
  BEFORE UPDATE ON public.winnow_org_profile
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


-- ============================================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================================
--
-- WINNOW is an internal ops tool. Access is gated to the afs_internal tier
-- via the user's user_profiles.tier — RLS is the actual security boundary;
-- the 'winnow' module entitlement (014/010) just controls UI visibility.
--
-- Both SELECT and UPDATE are allowed for afs_internal so any team member
-- can collaboratively edit the canonical AFS profile.
-- INSERT is allowed too so the seed below can be re-run via the SQL editor
-- if the row gets deleted; in normal operation there is exactly one row.
-- DELETE is intentionally NOT policied — service-role only, to prevent an
-- accidental "delete from winnow_org_profile" from wiping the singleton.

ALTER TABLE public.winnow_org_profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "afs_internal reads org profile" ON public.winnow_org_profile;
CREATE POLICY "afs_internal reads org profile"
  ON public.winnow_org_profile
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.tier = 'afs_internal'
    )
  );

DROP POLICY IF EXISTS "afs_internal writes org profile" ON public.winnow_org_profile;
CREATE POLICY "afs_internal writes org profile"
  ON public.winnow_org_profile
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.tier = 'afs_internal'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.tier = 'afs_internal'
    )
  );

DROP POLICY IF EXISTS "afs_internal inserts org profile" ON public.winnow_org_profile;
CREATE POLICY "afs_internal inserts org profile"
  ON public.winnow_org_profile
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.tier = 'afs_internal'
    )
  );


-- ============================================================================
-- 5. SEED: AFS canonical row
-- ============================================================================
--
-- Sourced from:
--   * AFS Strategic Business Plan 2025-2027 (executive summary, sections 7.3,
--     6.2, market research)
--   * AFS Strategic Vision Statement (Sept 2025)
--   * A Farmer's Share Brochure (ACRE framework, services)
--   * Programs and Services in Detail v.13 (June, v2)
--   * User-confirmed in-session (2026-04-30):
--       - USA geography focus
--       - $1,000 ask_size_min_usd floor
--       - PBC with B-Corp status pending
--
-- ON CONFLICT DO NOTHING — once the row exists, edits flow through the UI,
-- not this seed. Re-running the migration is safe and won't clobber edits.

INSERT INTO public.winnow_org_profile (
  slug,
  legal_name,
  dba_name,
  entity_type,
  b_corp_status,
  state_of_incorporation,
  foreign_registrations,
  founded_date,
  leadership_attributes,
  service_lines,
  mission_statement,
  vision_statement,
  geography_focus,
  ask_size_min_usd,
  ask_size_max_usd,
  mission_tags,
  domain_expertise,
  revenue_streams,
  founders,
  website,
  primary_email,
  notes
) VALUES (
  'afs',
  'A Farmer''s Share Corporation',
  'A Farmer''s Share',
  'pbc',
  'pending_assessment',
  'DE',
  ARRAY['FL', 'KY'],
  DATE '2025-03-01',
  ARRAY['women_led'],
  ARRAY['advising', 'commons_lab', 'blueprint_reservoir', 'engagement_collective'],
  'To reshape the U.S. food system and revitalize rural communities by uniting change-makers to pool assets, empower small family farmers and processors, and enhance local food access through scalable, technology-enabled solutions that prioritize care, collectivity, transparency, and social impact.',
  'An equitable food system where small family farmers, food system actors and communities lead with confidence, supported by transparent, sustainable practices that revitalize rural economies, ensure food security, and instill trust in every harvest, delivering equitable benefits to all.',
  ARRAY['USA'],
  1000,
  NULL,
  ARRAY[
    'regional_food_systems',
    'small_family_farms',
    'regenerative_agriculture',
    'food_sovereignty',
    'food_access',
    'food_justice',
    'rural_economic_development',
    'urban_food_deserts',
    'farm_to_school',
    'aggregation_infrastructure',
    'local_processing_hubs',
    'mobile_farmers_markets',
    'community_supported_agriculture',
    'food_as_medicine',
    'cooperative_composting',
    'circular_economy',
    'upcycled_food',
    'zero_waste',
    'zero_hunger',
    'emergency_food_relief',
    'farm_worker_health',
    'farm_worker_immigration',
    'bipoc_land_ownership',
    'women_in_agriculture',
    'agtech_blockchain',
    'supply_chain_transparency',
    'carbon_credits',
    'soil_health',
    'climate_smart_agriculture',
    'food_safety_fsma',
    'usda_compliance',
    'microfinance',
    'social_entrepreneurship',
    'b_corp_development',
    'cooperative_governance',
    'fiscal_sponsorship'
  ],
  ARRAY[
    'usda_programs',
    'usaid_programs',
    'philanthropic_grant_management',
    'commercial_agriculture',
    'rural_development',
    'food_safety_fsma_section_204',
    'fcc_iot_compliance',
    'ftc_data_privacy',
    'gs1_standards',
    'organic_certification',
    'fair_trade_certification',
    'b_impact_assessment',
    'international_development',
    'systems_thinking',
    'agricultural_policy'
  ],
  ARRAY[
    'consulting_hourly',
    'consulting_deliverable',
    'consulting_retainer',
    'grants',
    'sponsorships',
    'profit_share',
    'event_registration',
    'training_licensing'
  ],
  '[
    {
      "name": "Kelsey Hood Cattaneo, EdD",
      "title": "Co-Founder & Chief Executive Officer",
      "focus": "Operationalizes transformative solutions; international development expertise in rural economies; systems-thinking; consulting, technology, and B-Corp initiatives."
    },
    {
      "name": "Dawn R. Riley",
      "title": "Co-Founder & Chief Community Officer",
      "focus": "Forges critical partnerships across agriculture and policy; branding, marketing, communications; producer of Roots of Governance podcast."
    }
  ]'::jsonb,
  'https://afarmersshare.com',
  'admin@afarmersshare.com',
  'Singleton row. Edit via /winnow/onboarding rather than direct SQL. Phase 1 (Foundational, 2025) complete; entering Phase 2 (Southeast Expansion, 2026); Phase 3 (National, 2027) on plan. Plans to launch a 501(c)(3) arm in Q3 2026 — until then, federal grants requiring 501(c)(3) status flow through partner pass-throughs (see winnow_org_relationships).'
)
ON CONFLICT (slug) DO NOTHING;
