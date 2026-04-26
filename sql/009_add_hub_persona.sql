-- 009_add_hub_persona.sql
-- Phase 7 follow-up: adds `hub` runtime persona for the food-movement role
-- (aggregators, food hubs, processors, distributors). Introduced when the
-- entry-style landing page added a sixth role tile — "I move food" — that
-- needed its own persona slug so users aren't silently routed to policymaker.
--
-- Tier still drives entitlements; this is only a UX/dashboard distinction.
-- Hub-persona users typically have tier=buyer_foodhub or buyer_processor and
-- (until a hub-specific dashboard exists) see the buyer dashboard layout.
--
-- Idempotent — ADD VALUE IF NOT EXISTS is safe to re-run.
-- First applied: TBD

ALTER TYPE public.persona_t ADD VALUE IF NOT EXISTS 'hub';
