# BUILD_STATE_AUDIT.md

**Audit date:** 2026-08-08
**Auditor:** Claude Code (session-scoped, read/execute only — no development performed)
**Repo:** `afarmersshare/demoprov` · branch `claude/provender-tech-briefing-ciap5d` @ `33361b1`

## Audit conditions (read this first — it explains every "cannot verify")

This audit ran in an ephemeral CI-style container. Two hard limits shaped what
could and could not be verified. Both are environmental, not defects in the app:

1. **No Supabase credentials.** There is no `.env*` file in the repo (correctly
   gitignored), and no `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   / service-role key is injected into the environment (verified with `env` and
   per-variable checks — all unset). **I could not connect to any database.**
   Every claim about live DB state (tables, row counts, RLS actually enabled,
   triggers actually firing, real vs. synthetic data) is therefore **"cannot
   verify"** — I can only report what the committed migrations and application
   code *declare*, which is not the same as what is live.
2. **Egress blocked to the deployment.** `https://prov-demo.afarmersshare.com`
   and `https://atlas-demo.afarmersshare.com` are both blocked by the network
   egress proxy (`EGRESS_BLOCKED`). **I could not fetch the deployed site.**

Where I write **DECLARED** it means "defined in a committed migration/code file,
live state unconfirmed." Where I write **VERIFIED** it means I executed something
and observed the result in this session.

---

## 1. Repository

- **Directory tree** (excluding `node_modules`, `.git`, `.next`) — VERIFIED:

```
.
├── AGENTS.md
├── CLAUDE.md               (one line: @AGENTS.md)
├── README.md               (stock create-next-app readme — not project docs)
├── components.json
├── docs/
│   ├── embed-test.html
│   └── preservation_log.md
├── eslint.config.mjs
├── next.config.ts          (empty config — no custom settings)
├── package.json            (name: "provender-demo", version 0.1.0)
├── package-lock.json
├── postcss.config.mjs
├── public/                 (stock next/vercel svgs only)
├── scripts/
│   └── seed_test_users.mjs
├── sql/
│   ├── 008_auth_users.sql
│   ├── 009_add_hub_persona.sql
│   ├── 010_seed_default_entitlements.sql
│   ├── 011_test_user_promotion.sql
│   ├── 012_realbuild_table_policies.sql
│   ├── 013_module_landing.sql
│   └── demo_policies/001_anon_read.sql
├── src/
│   ├── app/                (routes: auth/, complete-profile/, contact-us/,
│   │                        login/, pricing/, profile/, reports/[slug]/,
│   │                        reset-password/, signup/, page.tsx, layout.tsx)
│   ├── components/          (see §2; includes _preserved-for-provender/)
│   ├── lib/                 (supabase/, auth/, reports/, csv, palette, utils,
│   │                        pipeline-sandbox)
│   └── middleware.ts
└── tsconfig.json
```

- **Last commit** — VERIFIED: `33361b1`, **2026-05-19 21:38 -0400**, "Phase 8:
  DNS cutover complete — atlas-demo live", author Kelsey Hood Cattaneo, co-authored
  by Claude. Commit body notes "Atlas pivot arc complete (Phases 1-8). Phase 9
  (aggregated Ground build) queued as separate sprint." **The build has had zero
  commits since 2026-05-19 — ~3 months of no repo activity before this audit.**
- **Last 20 commits** — VERIFIED: Phases 8→1 of the Atlas pivot (all 2026-05-19),
  then a run of 2026-04-28 / 2026-04-27 / 2026-04-26 IA, auth, profile, and
  pricing work. Full list captured; the pivot (8 commits) and the prior IA/auth
  build are the two clusters.
- **Uncommitted changes** — VERIFIED: none. `git status` → "working tree clean."
- **Unpushed branches** — VERIFIED: `claude/provender-tech-briefing-ciap5d` and
  `main` both point at `33361b1`; `origin/main` is at the same commit. No unpushed
  commits (`origin/<branch>..HEAD` is empty). Nothing is ahead of the remote.
- **Does it build?** — VERIFIED **YES**. `npm install` → exit 0. `npm run build`
  → **exit 0**, "Compiled successfully in 11.2s", TypeScript passed, 13/13 static
  pages generated. Next.js 16.2.4 (Turbopack). One deprecation warning: the
  `middleware` file convention is deprecated in favor of `proxy`. The build
  succeeds *without* Supabase env vars because all DB-backed routes are dynamic
  (`ƒ`, server-rendered on demand), so they don't execute at build time.
- **Does it run?** — VERIFIED, and this is important: with no Supabase
  credentials, **it does not run — every route returns HTTP 500.** See §2.

---

## 2. What renders

**Runtime probe** — VERIFIED. Started `next dev` on port 3111 (no env vars) and
curled every route. **All 10 routes returned HTTP 500 with an identical 4110-byte
error body.** Exact server-side error captured from the dev log:

> `Error: Your project's URL and Key are required to create a Supabase client!`
> thrown at `createServerClient` → `updateSession` → `middleware`
> (`src/lib/supabase/middleware.ts:10`).

**Root cause:** `src/middleware.ts` runs on essentially every request and calls
`updateSession`, which constructs a Supabase server client from the (unset)
env vars. With no URL/key it throws, so the 500 happens *before any page renders*
— even static pages like `/pricing` and `/contact-us` that don't otherwise need
the DB. **Nothing renders in this environment.** This is a credentials artifact,
not proof the deployed app is broken (the Vercel deployment presumably has env
vars set — but that is **cannot verify**, see §7).

| Route | Build type | Live render (no creds) |
|---|---|---|
| `/` | Static shell + client data fetch | 500 (middleware) |
| `/pricing` | Static | 500 (middleware) |
| `/contact-us` | Static | 500 (middleware) |
| `/login` `/signup` `/complete-profile` `/reset-password` | Dynamic | 500 (middleware) |
| `/profile` | Dynamic | 500 (middleware) |
| `/reports/[slug]` | Dynamic | 500 (middleware) |
| `/auth/callback` `/auth/signout` | Dynamic (route handlers) | 500 (middleware) |

**Feature existence — CODE level (VERIFIED present) vs. live render (cannot verify):**

| Feature | Exists in code? | File | Live? |
|---|---|---|---|
| MapLibre map view | YES | `src/components/farms/farms-map.tsx`, `dashboards/policymaker-map.tsx` | cannot verify |
| Entity detail panel | YES | `src/components/farms/entity-detail-panel.tsx` (+ `farm-detail-panel.tsx`) | cannot verify |
| Community Wealth Score | YES (referenced) | `src/components/dashboards/policymaker.tsx:514` ("Community Wealth Score ranking") | cannot verify |
| Gap callouts | YES | `src/components/dashboards/gap-analysis.tsx` — computed client-side (supply−demand)/demand per county, **not** read from a gap table | cannot verify |
| Altitude tabs System/Territory/Flow/Ground | YES | `src/components/farms/network-explorer.tsx:281` `type Altitude = "system"|"territory"|"flow"|"ground"` | cannot verify |

**Screenshots:** not taken. Every route is a 500 error page in this environment,
so a screenshot would only capture the Next.js error overlay. Data-dependent
views (map, entity panel, CWS, gap callouts) cannot render without a database.

---

## 3. Database

**CANNOT VERIFY BY QUERY — no Supabase connection is possible from this
environment (no credentials).** I did not read the schema doc and infer; I am
explicitly reporting that the query could not be run. What follows is derived
from *application code* (`.from(...)` calls) and *committed migrations* only.

- **Tables the application actually queries** (VERIFIED from `grep '.from('` in
  `src/`): `farms`, `markets`, `distributors`, `processors`, `recovery_nodes`,
  `enablers`, `regions`, `farm_crops`, `relationships`, `persons`, plus a view
  `v_document_status`, and auth tables `user_profiles`, `user_module_entitlements`.
  Storage bucket for avatars is also referenced.
- **Row counts:** cannot verify.
- **Which schema-v2.1 tables exist / are missing:** cannot verify. **However, a
  code-level mismatch is worth flagging** — the schema-doc names referenced in
  the strategy brief do **not** match what the code queries:
  - Brief says `farm_market_relationships`; **code queries `relationships`**.
  - Brief/architecture names `compliance_gap_flags` and `impact_ledger` as
    central tables. **Neither string appears anywhere in `src/`** (VERIFIED:
    grep returns nothing). The app never reads them. Gap analysis is *computed*
    in `gap-analysis.tsx`, not read from `compliance_gap_flags`.
  So either those tables exist in the DB but are unused by this frontend, or they
  don't exist. **Cannot verify which** — but the frontend does not depend on them.
- **Tables that exist but aren't in the schema doc:** cannot verify (would need a
  live `information_schema` query).
- **3 sample rows from `farms` / `markets` / `farm_market_relationships`:** cannot
  verify. Note the third table name does not exist in code (`relationships` is the
  actual name).
- **Is `compliance_gap_flags` populated with real values or nulls?** cannot verify
  — and the frontend does not query it, so it has no observable effect on the app.

---

## 4. Auth and access control

**Live state = cannot verify (no connection).** Migration-DECLARED state below.

- **`profiles` table:** The app uses **`user_profiles`**, not `profiles` (VERIFIED
  from code + `sql/008_auth_users.sql:74`). Columns DECLARED in `sql/008`:
  `user_id` (FK to `auth.users`), `tier`, `persona`, timestamps (full column list
  is in the migration). A sibling table `user_module_entitlements` gates modules.
- **`handle_new_user()` trigger:** The audit's function name is not what exists.
  The DECLARED function is **`handle_new_auth_user()`**, wired via trigger
  **`on_auth_user_created` AFTER INSERT ON `auth.users`** (`sql/008:137-146`),
  which inserts a `user_profiles` row on signup. The migration comment even notes
  *why* ("signup returns no rows and the page 500s" without it). **Whether it is
  installed and firing in the live DB: cannot verify.**
- **RLS policies (DECLARED in migrations, live state cannot verify):**
  - `sql/008`: RLS ENABLED on `user_profiles` and `user_module_entitlements`;
    policies "user reads own profile", "user updates own profile", "user reads
    own entitlements".
  - `sql/demo_policies/001_anon_read.sql`: loops every table in `public` and
    creates `"anon read" ... FOR SELECT TO public USING (true)`.
  - `sql/012_realbuild_table_policies.sql`: a **different** model (a "tenant read"
    policy loop) for a **different** project.
- **Tables with RLS on but no policy (fail-closed):** cannot verify — this needs a
  live `pg_policies` vs `pg_class.relrowsecurity` query.
- **Can an unauthenticated anon key reach any table?** — cannot verify by test
  (no connection), but the **demo project migration explicitly grants it.**
  `sql/demo_policies/001` grants `SELECT ... TO public USING (true)` on every
  public table — i.e., **on the demo project, anon read of every table is
  intended and open** (writes blocked). The real-build file `sql/012` states anon
  gets "no access to any business data." **These are two different projects with
  two different access models** (see §9 — this is a trap for a future session).
- **Does signup work end to end?** cannot verify — requires a live Supabase auth
  endpoint and SMTP. Not testable without credentials.

---

## 5. Data

- **Seed data in the repo:** VERIFIED — **there is none for entities.** `grep`
  for `INSERT INTO (farms|markets|distributors|...)` across `sql/` and `scripts/`
  returns nothing. The only committed seed is `scripts/seed_test_users.mjs`, which
  provisions **test auth users**, not food-system entities. **All entity data
  lives in Supabase, not in this repo.**
- **Region:** DECLARED throughout the UI as **Louisville–Kentuckiana** (e.g.,
  `layout.tsx:24` "Atlas — Louisville food-system explorer", `site-footer.tsx:40`
  "Louisville & Kentuckiana · Demo build", `pricing/page.tsx:126` "illustrative
  seed data for Louisville and Kentuckiana"). The "Northeast" region from the
  strategy brief does **not** appear — the build is Louisville-only.
- **Entity counts of each type:** cannot verify (data is in the DB).
- **Real vs. synthetic:** cannot verify by query. Code copy repeatedly calls it
  "illustrative seed data" / "a working slice … real entities, anonymized where
  appropriate" — contradictory signals in the copy itself, and **not resolvable
  without querying the DB.**
- **Any records from a real farm or buyer (person-provided data):** **CANNOT
  VERIFY — and this is the one to resolve before anything else.** If the DB
  contains any real person's data (contact info, farm details someone gave AFS),
  the demo project's blanket `anon read TO public` policy (§4) would expose it to
  any unauthenticated visitor. I cannot confirm presence or absence from here.
  **Flagged as the top consent/privacy follow-up.**

---

## 6. External integrations

- **Wired up and returning data:** VERIFIED **none.** There is no integration
  code for USDA AMS, Google Places, or the Farm to School Census — no API client,
  no fetch to those services, no keys referenced.
- **Stubbed / hardcoded:** The only "USDA" references are (a) a comment in
  `src/lib/reports/csv-generators.ts:344` ("pulls from USDA access data etc." —
  aspirational), and (b) **entity attribute fields** rendered from DB rows
  (`usda_inspected`, `usda_funded`, `organic_cert` → "USDA Organic" in
  `entity-detail-panel.tsx`). These are display fields on seeded records, not live
  API calls. Google Places and Farm to School Census: **no references at all.**
- **Expired credentials:** none to check — there are no external-API credentials
  in the repo or environment. (Supabase creds are absent entirely — see §1.)

**Conclusion:** external integrations remain FUTURE/unbuilt, consistent with the
May backlog. The data is static seed, not synced.

---

## 7. Deployment

**CANNOT VERIFY — egress to both demo domains is blocked by the network proxy
(`EGRESS_BLOCKED` on `prov-demo.afarmersshare.com` and
`atlas-demo.afarmersshare.com`).** I could not fetch either URL.

From committed evidence only (DECLARED, `docs/preservation_log.md` Entries 6–7):
- Live URL is intended to be **`atlas-demo.afarmersshare.com`**, with
  **`prov-demo.afarmersshare.com` 308-redirecting** to it.
- Deploys from **Vercel**, project name `demoprov` (repo not renamed).
- **Whether the deployment matches local `33361b1`, or how far behind/ahead it is:
  cannot verify.** Given no commits since 2026-05-19, local is frozen at the end
  of the Atlas pivot; the deployment could be at that commit, ahead (hotfixes
  applied via Vercel/dashboard), or behind. Not determinable from here.
- **Pipeline details** (branch → Vercel project mapping, env var configuration):
  cannot verify — that config lives in the Vercel dashboard, not the repo.

---

## 8. Furrow

**CANNOT VERIFY — Furrow is not in this repository.** The only reference is a
comment in `docs/preservation_log.md:575` noting `furrow.afarmersshare.com` "is a
separate app." There is no Furrow source here.

- **Connected to Supabase or in-memory:** cannot verify (separate codebase).
- **`provender_tracker_tasks` table:** the string does not appear anywhere in this
  repo (VERIFIED grep). Its existence/rows: cannot verify.
- **Current task statuses:** cannot verify.

To audit Furrow, its own repo would need to be added to the session.

---

## 9. Assessment

### Genuinely finished and working (VERIFIED where possible)
- **The build pipeline.** Clean `npm install` + `npm run build`, TypeScript
  passes, 13 routes compile. This is real and current.
- **The frontend codebase is intact and coherent** — 50+ components, a full
  route set, the altitude IA (`system/territory/flow/ground`), MapLibre map
  components, entity detail panel, reports, auth flows (login/signup/reset/
  complete-profile/profile), consent-revocation UI, and a complete
  `_preserved-for-provender/` set. All present at code level.
- **The Atlas rename is complete and consistent** in code (every user-facing
  string says Atlas; `site-footer.tsx:22`, `layout.tsx:24`, etc.).
- **Auth/entitlement migrations are written** (`sql/008`–`013`) with the signup
  auto-provision trigger and own-row RLS.

### Half-built / started, not functional here
- **Nothing runs without credentials.** The app is 100% dependent on injected
  Supabase env vars; absent them, middleware 500s every route. Not a bug, but it
  means this repo is not self-contained/runnable — it needs an external secret set
  that is not documented in the repo (no `.env.example`).
- **`compliance_gap_flags` / `impact_ledger`** — named as central to the model but
  **not referenced by the frontend at all.** Either unbuilt in the app layer or
  living only in the DB unused by this UI.
- **Gap analysis** is a client-side supply/demand computation per county
  (`gap-analysis.tsx`), **not** the relationship-level compliance-gap engine the
  business model describes. The "billable gap on a farm-market relationship"
  concept is not implemented in this frontend.

### In the docs/brief but never started (in this repo)
- External API integrations (USDA AMS, Google Places, Farm to School Census).
- The Northeast region instance (build is Louisville-only).
- Terms of Service and Privacy Policy pages (no `/terms`, no `/privacy` route).
- Furrow (separate app, not here).

### Hardcoded / worked-around — things a future session would NOT guess
1. **Two Supabase projects with opposite access models.** `sql/demo_policies/001`
   (project `lxehhllpomioqvjdjqzq`) opens **anon read on every table**;
   `sql/012` (the "real Provender project, NOT lxeh…") locks anon out entirely.
   **Applying the wrong SQL to the wrong project is a data-exposure incident.**
   The file headers are the only warning.
2. **Field-level secrecy is enforced in the application, not in RLS.**
   `sql/012` explicitly says contact email/address masking is done in
   `entity-detail-panel` based on `contact_visibility` + viewer tier — "not a
   row-level secrecy gate." Anyone who queries the DB directly (or via the demo's
   open anon policy) bypasses that masking entirely.
3. **Module gating is a UX gate, not a security gate** (`sql/012` header): every
   authenticated tier can SELECT every entity row; which tab renders it "live vs.
   upsell" is decided client-side via `user_module_entitlements`.
4. **The trigger is `handle_new_auth_user()` / `on_auth_user_created`**, not the
   conventional `handle_new_user`. Grep for the wrong name finds nothing.
5. **Preserved-not-deleted operator code** lives in
   `src/components/_preserved-for-provender/` and is excluded from tsconfig
   type-checking (so it carries intentionally-broken imports). A future engineer
   grepping for "Pipeline" or "Landing tab" will find dead-looking code that is
   actually staged for the Provender build sprint.

### Broken in ways not obvious from looking
- **The middleware single-point-of-failure.** Because `src/middleware.ts` builds a
  Supabase client eagerly, a missing/invalid env var takes down *every* route with
  a 500 — including purely static marketing pages. There is no graceful
  degradation. A misconfigured env var in production would black out the whole
  site, not just data views.
- **No `.env.example` and a stock `README.md`.** Nothing in the repo tells a new
  engineer which env vars are required or which Supabase project to point at. The
  knowledge lives only in migration-file comments and a person's memory.

---

## "Cannot verify" list (environment-limited — all traceable to §Audit conditions)

1. Any live database state: table existence, row counts, `information_schema`.
2. Sample rows from `farms` / `markets` / `relationships`.
3. Whether `compliance_gap_flags` / `impact_ledger` exist or are populated.
4. Whether RLS is actually enabled per table live; tables RLS-on-but-no-policy.
5. Whether `handle_new_auth_user()` is installed and firing live.
6. Live anon-key access test (only the *declared* policy is known).
7. End-to-end signup (needs live auth + SMTP).
8. Entity counts, and whether any seed data is real/person-provided — **the
   consent-critical question in §5.**
9. Supabase custom SMTP status (dashboard-side; no repo footprint).
10. External API credentials/expiry (none exist to test).
11. What is deployed at `prov-demo` / `atlas-demo`, and drift vs. local (egress
    blocked).
12. Deployment pipeline / Vercel env configuration.
13. Everything about Furrow (separate repo not in session).

**To close these:** provide the demo project's `NEXT_PUBLIC_SUPABASE_URL` +
`NEXT_PUBLIC_SUPABASE_ANON_KEY` (read-only anon is enough for §3/§5 counts and the
anon-access test), allow egress to the two demo domains for §7, and add the Furrow
repo to the session for §8.
