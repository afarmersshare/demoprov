-- 011_test_user_promotion.sql
-- Helper for setting up one test login per persona/tier so each surface
-- can be exercised in isolation while the real onboarding flow is still
-- being built.
--
-- IMPORTANT — workflow:
--   1. SIGN UP each test email through the live login page. Magic-link is
--      easiest: open /login, paste the email, click the link in the inbox.
--      This is the step Postgres CANNOT do for you — auth.users rows are
--      created by Supabase Auth, not by SQL migrations. There is no way
--      around this; service-role admin API would work but isn't worth
--      wiring up just for fixtures.
--   2. RUN this migration once (creates the helper functions).
--   3. RUN the promotion calls at the bottom of this file (or the
--      equivalents from the SQL editor) to set tier + persona for each
--      test account. Re-run any time to flip a tier or reseed entitlements.
--
-- The promotion path:
--   promote_user(email, tier, persona)
--     → updates user_profiles
--     → wipes any old entitlement rows for that user
--     → seeds default entitlements for the new tier (via 010 helper).
--
-- Wiping entitlements first means promotion is idempotent and accurately
-- reflects "what someone of this tier should see" — without it, a user
-- promoted from demo (all 9 modules) to farmer_free (3 modules) would
-- still have all 9 rows in user_module_entitlements and the gating would
-- be wrong.
--
-- For PRODUCTION user lifecycle changes, use a softer helper that does
-- NOT delete existing rows (preserves manual unlocks) — see 010's
-- seed_default_entitlements. promote_user is for fixtures only.


-- ============================================================================
-- 1. PROMOTION HELPER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.promote_user(
  p_email   text,
  p_tier    public.tier_t,
  p_persona public.persona_t
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower(p_email);

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION
      'No auth.users row for %. Sign up the email via /login (magic-link) first.',
      p_email;
  END IF;

  -- Ensure the profile row exists. The on_auth_user_created trigger from
  -- 008 should have done this already, but be defensive — if for some
  -- reason it didn't fire, this keeps promotion idempotent.
  --
  -- Stamps profile_completed_at unconditionally so test fixtures land
  -- gate-cleared. Real users go through fn_complete_profile, not this.
  INSERT INTO public.user_profiles (user_id, tier, persona, profile_completed_at)
  VALUES (v_user_id, p_tier, p_persona, NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET
    tier                 = EXCLUDED.tier,
    persona              = EXCLUDED.persona,
    profile_completed_at = COALESCE(public.user_profiles.profile_completed_at, EXCLUDED.profile_completed_at);

  -- Reset entitlements to the canonical defaults for the new tier.
  DELETE FROM public.user_module_entitlements WHERE user_id = v_user_id;
  PERFORM public.seed_default_entitlements(v_user_id);

  RETURN v_user_id;
END;
$$;

COMMENT ON FUNCTION public.promote_user(text, public.tier_t, public.persona_t) IS
  'Test-fixture helper: looks up a user by email, sets their tier+persona, and reseeds entitlements from scratch. Raises if the email has not signed up yet.';


-- ============================================================================
-- 2. SUGGESTED TEST ACCOUNTS (COPY/PASTE AFTER SIGN-UP)
-- ============================================================================
--
-- Sign up these seven emails via /login first, then uncomment and run.
-- Pick whichever subset matches the testing you actually need; they're
-- independent.
--
-- Convention: test-<persona>@<your demo domain>.dev — pick a domain you
-- actually own so magic-link delivery works. If your team uses Gmail
-- aliases, "yourname+farmer@gmail.com" works too.
--
-- SELECT public.promote_user('test-farmer@provender.dev',     'farmer_paid',         'farmer');
-- SELECT public.promote_user('test-buyer@provender.dev',      'buyer_institutional', 'buyer');
-- SELECT public.promote_user('test-hub@provender.dev',        'buyer_foodhub',       'hub');
-- SELECT public.promote_user('test-policy@provender.dev',     'government',          'policymaker');
-- SELECT public.promote_user('test-nonprofit@provender.dev',  'nonprofit',           'nonprofit');
-- SELECT public.promote_user('test-funder@provender.dev',     'funder',              'funder');
-- SELECT public.promote_user('test-afs@provender.dev',        'afs_internal',        'afs');
--
-- For testing the freemium upsell surface specifically:
--
-- SELECT public.promote_user('test-farmer-free@provender.dev', 'farmer_free', 'farmer');
--
-- To revert any test account back to the open-demo experience:
--
-- SELECT public.promote_user('test-whatever@provender.dev',   'demo',                'explore');
