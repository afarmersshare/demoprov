# Preservation Log

A narrative record of every operator-flavored component, copy block, or
configuration that was preserved during the May 2026 Atlas pivot.

Each entry has two parts:

- **The story** — what was this thing, who was it for, why it's here now,
  what brings it back.
- **The tech specs** — concrete filenames, paths, dependencies, and the
  exact resurrection steps for a future engineer.

Entries are appended chronologically. Don't edit past entries; add a
**Follow-up** note if something changes.

---

## Entry 0 — Preservation infrastructure established

**Date:** 2026-05-19
**Phase:** 1
**Status:** Preserved (not yet resurrected)
**Author:** Claude (with Kelsey's explicit go-ahead)

### The story

This is the meta-entry — the one that documents the creation of the log
itself. Before we started moving any operator code, we needed somewhere to
move it to and somewhere to write down why. This entry exists so a future
engineer reading the log knows where it came from and what the conventions
are.

The Atlas pivot — splitting what we'd been building as a unified "Provender"
demo into three sibling products on a shared **Survey** data layer — was
decided on 2026-05-19 after a full advisor consult (Calla on growth
architecture, Pell on brand, Remy on revenue path, Sable on synthesis).
The architecture is:

- **Survey** — shared data substrate (Supabase, schema, entity records,
  Community Wealth Score engine, data provenance). Internal infrastructure.
  Not customer-facing as a named thing.
- **Atlas** — reader product for cities, food councils, funders, CDFIs,
  nonprofits, researchers. Macro legibility of a regional food system.
  Ships first. Target: June 20, 2026 demo.
- **Provender** — operator product for aggregation businesses (food hubs,
  distributors, aggregators). CRM-shaped. Builds Aug–Nov 2026 to support
  AFS's own internal aggregation pilot (real product moving in 3–6 months).
- **Tilthe** — verification product for compliance/traceability (FSMA,
  regenerative, buyer-specific). Builds third, buyer-demand-driven.

The work in this codebase already includes a lot of operator-flavored
components — a personalized Landing tab scoped to your organization, a
Pipeline tab for sales tracking, a scope toggle that flips between
"foodshed" and "my organization" views, a persona switcher in the top bar,
operator-specific tier values in the database, a pricing page tied to a
unified tier × modules matrix.

Those components don't get deleted. They get preserved so Provender's build
sprint inherits them in three to four months rather than rebuilds them.
The preservation discipline is the whole point: nothing we've built is
disposable.

### Tech specs

**Created:**
- `src/components/_preserved-for-provender/` (folder)
- `src/components/_preserved-for-provender/README.md` (folder rules,
  resurrection protocol, folder map)
- `docs/preservation_log.md` (this file)

**Conventions established:**
- Files moved into the preservation folder keep their original names.
- The Atlas surface (`src/app/`, `src/components/farms/`, etc.) does not
  import anything from `_preserved-for-provender/`.
- Every move adds a numbered entry to this log.
- Resurrection happens by moving files OUT of `_preserved-for-provender/`
  during Provender's build sprint, after checking Survey-side dependencies
  haven't drifted.

**Not yet preserved (queued for upcoming phases):**
- `src/components/farms/landing-tab.tsx` — Phase 2
- Pipeline tab — Phase 2 (location to be confirmed during the phase)
- Persona switcher and scope-toggle "org" mode embedded inside
  `src/components/farms/network-explorer.tsx` — Phase 3 (will be
  conditionalized in-place behind a `showOperatorControls` prop, not
  physically moved)
- Operator persona options in the signup form — Phase 4
- Pricing tier-matrix display — Phase 5

**Resurrection trigger:** Provender build sprint begins (estimated August
2026, gated by AFS aggregation pilot kickoff).

---

## Entry 1 — Landing tab and Pipeline dashboard preserved

**Date:** 2026-05-19
**Phase:** 2
**Status:** Preserved (not yet resurrected)
**Author:** Claude (with Kelsey's explicit go-ahead)

### The story

Two operator-facing surfaces moved from active Atlas code into preservation
today: the **personalized Landing tab** and the **Pipeline dashboard**.

The **Landing tab** was the personalized "your home view" rendered when an
authenticated operator (a farmer, buyer, or food hub persona) hit the demo.
It said *"Welcome back, [Name]"*, showed their tier badge, and offered
capability cards that navigated to other tabs based on what their tier
unlocked. The whole concept assumes the viewer *operates* something —
they have a farm, a buying program, a hub — and the view orients them
to their own work. Atlas readers (city planners, funders, nonprofits) don't
operate anything inside the system, so a personalized Landing doesn't fit.
The component lives intact for Provender, which absolutely needs an
operator home view when it ships for AFS internal aggregation operations.

The **Pipeline dashboard** was the AFS-internal sales pipeline tracker —
a CRM-shaped view of farms in various enrollment stages, paired with
compliance gap data per farm. It was the most operator-specific surface
in the entire build, gated to the `afs_internal` tier, accessed via a
"Pipeline · AFS" button in the bottom Tools strip. Atlas readers have no
business seeing a sales pipeline. The Pipeline dashboard preserves cleanly
for Provender — the data model (farms + compliance gaps + enrollment
stage) is exactly what aggregator operators need.

The IA structure stays unchanged: the watershed altitude grid (System ·
Territory · Flow · Ground × Overview · Farms · Buyers · Gaps) is the
Atlas surface and stays in place. What changed: the System × Overview ×
org cell, which previously rendered the personalized Landing tab,
now falls through to the regional Dashboard. The org-scope behavior
itself (the foodshed↔org toggle's "org" mode) is preserved for Phase 3
to handle properly — that's a `showOperatorControls` prop on the
explorer, not a file move.

### Tech specs

**Files moved (via `git mv` to preserve history):**

| From | To |
|---|---|
| `src/components/farms/landing-tab.tsx` | `src/components/_preserved-for-provender/landing-tab.tsx` |
| `src/components/dashboards/pipeline-dashboard.tsx` | `src/components/_preserved-for-provender/pipeline-dashboard.tsx` |

**Edits to `src/components/farms/network-explorer.tsx`:**

- Removed `import { PipelineDashboard } from "../dashboards/pipeline-dashboard";`
- Removed `import { LandingTab } from "./landing-tab";`
- Removed `"landing"` and `"pipeline"` from `TAB_ORDER`
- Removed the entire `<TabsContent value="landing">` block
- Removed the entire `<TabsContent value="pipeline">` block
- Removed the special-case "landing" branch in the `activeTab` derivation
  (org-scope System × Overview now falls through to `CELL_TO_SLUG` →
  "dashboard")
- Removed the special-case "landing" handler in `setActiveTab`
- Removed the "Pipeline · AFS" button from the bottom Tools strip
- Updated comments at lines 273 and 1385 to note Pipeline preservation
- Updated comment at line 378 to remove the LandingTab-specific reference

**Edits to `tsconfig.json`:**

Added `src/components/_preserved-for-provender` to the `exclude` array so
TypeScript does not type-check files in the preservation folder. This
allows preserved files to carry broken relative imports
(e.g., `landing-tab.tsx` imports `./network-explorer`, which no longer
resolves from its new location) without failing the Atlas build.

**Verification:** `npm run build` passes cleanly after edits. Routes
unchanged (/, /auth/*, /complete-profile, /contact-us, /login, /pricing,
/profile, /reports/[slug], /reset-password, /signup).

**Visible demo changes:**

- The personalized "Landing" tab no longer renders. Operator personas
  (farmer/buyer/hub) still default to System × Overview × org but that
  cell now shows the regional Dashboard.
- The "Pipeline · AFS" button is gone from the bottom Tools strip.
- The Pipeline tab cannot be reached even by URL because there's no
  `<TabsContent value="pipeline">` to render.

**Resurrection notes for Provender's build sprint:**

1. **Landing tab** — `landing-tab.tsx` will need its `./network-explorer`
   import path updated to wherever NetworkExplorer ends up in Provender's
   tree. The Persona type is imported from network-explorer; Provender
   will likely keep the same type. The `onSelectTab` prop callback
   pattern stays usable.
2. **Pipeline dashboard** — `pipeline-dashboard.tsx` is self-contained
   except for `Farm` and `complianceByFarm` types (from network-explorer
   and a sibling module). It needs minimal modification to plug back in.
3. **The activeTab special-case** — in Provender's network-explorer (or
   whatever replaces it), restore the special-case so that org-scope
   System × Overview returns "landing" instead of falling through to
   dashboard. Restore the `<TabsContent value="landing">` block.
4. **The Tools strip Pipeline button** — restore inside the Tools strip,
   gated by `isUnlocked("pipeline")`.
5. **TAB_ORDER** — re-add `"landing"` and `"pipeline"` slugs.
6. **tsconfig** — once files are moved out, the `_preserved-for-provender`
   exclude can stay (other preserved items will still be there) or be
   removed depending on cleanup state.

**Resurrection trigger:** Provender build sprint, Aug–Nov 2026.

---

## Entry 4 — Tier × modules pricing page replaced with request-access stub

**Date:** 2026-05-19
**Phase:** 5
**Status:** Preserved (full original file in preservation folder)
**Author:** Claude (with Kelsey's long-leash go-ahead)

### The story

The `/pricing` page previously showed the locked-2026-04-28 unified-product
tier × modules matrix — four tier blocks (Farmer / Producer, Buyer /
Institution, Government, Nonprofit, Research, Licensed Aggregator), each
with eyebrow + name + price headline + price detail + included-modules
chip list + description + mailto CTA. It also rendered a "highlight"
banner when a user landed on it from a locked module (e.g.,
`/pricing?highlight=pipeline` would steer them to the aggregator tier).

That entire page was constructed around the unified-product framing where
one platform served farmers, buyers, gov/nonprofits, and aggregators each
at different price points with different modules unlocked. Under the
three-product architecture (Atlas → Provender → Tilthe), each product
gets its own pricing, and the unified tier matrix gets retired or
restructured (deferred per the advisor consult to after June 20).

For Atlas specifically, pricing is undefined right now — Remy hasn't
ruled on it yet (per the v2-α conversation queue). So the Atlas access
page is a request-form stub: who Atlas is for, get-in-touch language,
mailto CTA. No tier table, no price figures.

The full original pricing page is preserved verbatim in
`_preserved-for-provender/pricing-tiers/pricing-page.tsx` — including
the TIER_BLOCKS constant, the MODULE_TIER_HINT lookup, the highlight
banner logic, and the four detailed tier descriptions. When Provender's
pricing question comes back to the table (post-June-20), the tier
content here is the starting point. Even if Atlas, Provender, and Tilthe
each get separate pricing pages, the language and structure here are
reusable references.

### Tech specs

**Files moved:**

| From | To |
|---|---|
| `src/app/pricing/page.tsx` | `src/components/_preserved-for-provender/pricing-tiers/pricing-page.tsx` |

**New `src/app/pricing/page.tsx`:**

- Server-side rendered page (Next.js App Router convention)
- Imports: Link, Metadata type, ArrowRight icon, AuthChip, SiteFooter
- Top nav matches the rest of the site (Provender wordmark + AuthChip)
- Three sections in the main column:
  1. Header — "Request access for your organization" + paragraph framing
     Provender as the intelligence layer for non-operators
  2. Audience card — four bulleted lines: cities/councils, nonprofits,
     funders/CDFIs/impact investors, researchers/journalists
  3. Get-in-touch CTA section — slate-blue accent box with mailto
  4. "How this works" — two-column reassurance about relationship-led
     access and illustrative demo data
- Bottom link back to "/" explorer

**What's removed from the active page:**

- TIER_BLOCKS constant (4 tier definitions)
- MODULE_LABEL + MODULE_TIER_HINT lookups
- Highlight banner logic (handles `?highlight=` query param)
- Per-tier price headlines, detail, includes chips, descriptions
- The "Four kinds of organizations" framing

**What's unchanged:**

- `/pricing` route still exists at the same path
- Navigation links to `/pricing` (from LockedModule, from
  cell-placeholder routing, from any hardcoded links) all still work
- The page still has SiteFooter and AuthChip
- The locked-2026-04-28 SQL tier matrix (`sql/010`, `sql/013`) is
  untouched in the migrations folder — only the UI surface changed

**Visible demo changes:**

- `/pricing` now shows a short request-access page instead of the
  four-block tier matrix.
- The "highlight" parameter from locked-module CTAs is ignored (the user
  still lands on /pricing, just sees the new stub regardless of which
  module they came from).
- Page metadata title changed from "Plans · Provender" to
  "Access · Provender".

**Resurrection notes for Provender's build sprint:**

1. The preserved `pricing-page.tsx` is a full working Next.js page. To
   resurrect: move it back to `src/app/pricing/page.tsx` (or to
   Provender's equivalent route), and the tier matrix returns.
2. Before resurrecting verbatim, decide:
   - Is this Atlas pricing, Provender pricing, or Tilthe pricing?
     (Probably Provender — the operator tiers in here are
     aggregator/buyer-shaped.)
   - Does the tier × modules matrix structure still match Provender's
     module set by then? Probably not — Provender will have its own
     modules.
3. The MODULE_TIER_HINT routing pattern (route locked-module clicks to
   the cheapest tier that unlocks them) is good UX worth keeping.
4. The 4-tier structure (Farmer / Buyer / Gov-Nonprofit / Aggregator)
   was already starting to feel forced for Atlas (which collapsed
   farmer/buyer/aggregator to operator-only and added researcher).
   Don't be afraid to restructure on resurrection.

**Resurrection trigger:** Provender (or Tilthe) build sprint with a
real pricing conversation behind it.

---

## Entry 5 — Copy sweep + dead-prop cleanup in network-explorer

**Date:** 2026-05-19
**Phase:** 6
**Status:** Cleanup (operator-flavored language and dead props removed)
**Author:** Claude (with Kelsey's long-leash go-ahead)

### The story

Phase 6 was scoped as a sweep of operator-flavored language across active
Atlas code paths. Surprising finding: almost all of the operator copy was
already inside files that got preserved in Phases 2, 3, 4, and 5 — the
personalized Landing tab's "Welcome back, [Name]" greeting, the Pipeline
dashboard's "Compliance gap flagging" CTAs, the scope-toggle's "live read
of your operations" descriptor, the pricing page's tier-block copy.

What remained in active code was a single dead-prop pattern: NetworkExplorer
still accepted `displayName?: string | null` and `tier?: Tier | null` props,
which were forwarded to the (now-preserved) LandingTab to render the
"Welcome back, [Name]" header and tier badge. With LandingTab gone, those
props had no callers using their values — they were just passed in from
page.tsx and ignored. Removing them tightens the explorer's interface and
makes it obvious to a future engineer that the explorer doesn't need to
know who's looking at it (the explorer is a viewer-agnostic IA shell;
viewer-aware behavior lives in surfaces the explorer renders).

No other operator phrases needed removal from the active demo. The remaining
"operator" or "AFS internal" mentions in active code are either:
- accurate role labels (e.g., `afs_internal` tier name in /profile)
- inside locked-module descriptions for modules that no longer render
  in Atlas (Pipeline lede)
- generic auth copy that applies to any user ("Create your account",
  "Welcome to Provender")
- comments about removed features that will be cleared on Phase 7 rename

### Tech specs

**Edits to `src/components/farms/network-explorer.tsx`:**

1. Removed `displayName` and `tier` from destructured props in the
   component signature.
2. Removed `displayName?: string | null` and `tier?: Tier | null` from
   the props type.
3. Removed the inline comment that documented them ("Optional — used by
   the Landing tab to render 'Welcome back, {name}'...").
4. Removed `Tier` from the `@/lib/auth/get-user` import — it was no
   longer referenced anywhere in the file.

**Edits to `src/app/page.tsx`:**

1. Removed `displayName={displayName}` and `tier={tier}` from the
   `<NetworkExplorer>` JSX. The component invocation is now
   `<NetworkExplorer persona={persona} entitledModules={entitledModules} />`.

**What's NOT changed:**

- "Create your account" auth copy — generic and audience-agnostic.
- "AFS internal" tier label in /profile — accurate description of an
  admin role.
- "Welcome to Provender" auth-page heading — neutral and will get
  renamed to Atlas in Phase 7.
- Module descriptions in `locked-module.tsx` for modules that no longer
  render (Pipeline) — dead code that doesn't reach Atlas users.

**Visible demo changes:**

- None visually. The dead-prop removal is purely internal.
- Future code archaeology is cleaner: NetworkExplorer has a tighter
  prop interface, no stale comments about LandingTab.

**Resurrection notes for Provender's build sprint:**

When LandingTab gets resurrected (per Entry 1's resurrection notes),
its parent will need to provide the user's `displayName` and `tier`
again. If NetworkExplorer is reused as Provender's IA shell, restore
the two props on its signature and pass them through from
Provender's page-level data fetcher. Or — likelier and cleaner — have
LandingTab read those values from its own data fetcher rather than
forwarding them through NetworkExplorer.

**Resurrection trigger:** Same as Entry 1 (Provender build sprint).

---

## Entry 6 — User-facing rename: Provender → Atlas

**Date:** 2026-05-19
**Phase:** 7
**Status:** Rename complete; repo + Vercel + DNS unchanged.
**Author:** Claude (with Kelsey's long-leash go-ahead)

### The story

Everything visible to a user — the wordmark in every nav, every page
title in the browser tab, every body-copy reference, every mailto subject
line, every consent checkbox label — now reads "Atlas" instead of
"Provender." The product the world sees is Atlas.

What did NOT change is intentional:

- The **repo name** (`afarmersshare/demoprov`) — renaming repos is fragile
  (Vercel, GitHub OAuth, scripts, environment configs all reference it).
  Repo gets renamed only when there's a real reason and a coordinated
  push to update every dependent.
- The **Vercel project name** — same reasoning.
- The **`prov-demo.afarmersshare.com` URL** — Phase 8 sets up the new
  `atlas-demo.afarmersshare.com` subdomain alongside.
- **Code comments** about "Provender's build sprint" — these correctly
  reference the future Provender product (the operator app) that will be
  built later. Keeping the word right where it belongs.
- The **`_preserved-for-provender/` folder name + contents** — that's
  literally Provender preservation; the word is correct.
- The **brand palette comment in `globals.css`** — calls the palette
  "Provender brand palette" historically; future Pell engagement can
  decide whether to rename to "AFS product family palette" or similar.
  Not user-facing; leave for naming-conversation cleanup later.

### Tech specs

**Files modified (user-facing strings):**

| File | What changed |
|---|---|
| `src/app/layout.tsx` | Page metadata title |
| `src/app/page.tsx` | Two wordmark instances (signed-in nav + embed-mode nav) |
| `src/app/contact-us/page.tsx` | Title, description, wordmark, body sentence |
| `src/app/complete-profile/page.tsx` | Wordmark |
| `src/app/login/page.tsx` | Wordmark, "Welcome to" heading, "New to" copy |
| `src/app/pricing/page.tsx` | Title, description, wordmark, body sentences, mailto subject |
| `src/app/profile/page.tsx` | Notification setting title, wordmark, welcome fallback, "X users" copy |
| `src/app/reset-password/page.tsx` | Wordmark |
| `src/app/signup/page.tsx` | Wordmark, "Create your account" heading |
| `src/app/reports/[slug]/page.tsx` | Report page title pattern |
| `src/components/contact/contact-form.tsx` | Mailto subject prefix |
| `src/components/site-footer.tsx` | Wordmark |
| `src/components/entry-banner.tsx` | "live X demo" sentence |
| `src/components/auth/profile-fields.tsx` | 3 consent checkbox labels ("X updates", "Opt out of X updates", "Do not show me in the X directory") |
| `src/components/profile/avatar-upload.tsx` | "other signed-in X users" copy |
| `src/components/farms/entity-detail-panel.tsx` | Mailto subject |
| `src/components/locked-module.tsx` | Mailto URL subject param |
| `src/components/reports/gap-analysis-report.tsx` | "X database" mention |
| `src/components/reports/report-shell.tsx` | Three report-footer strings (brand attribution, source dataset, generated-by note) |
| `src/components/landing.tsx` | Eight persona-keyed body-copy lines |

Total: 20 active files modified, approximately 40 string replacements.

**Execution method:**

The bulk of the rename ran as a batch of targeted `sed -i` invocations
in a single Bash command, each pattern unique enough not to match
preservation references. Each pattern was tested before execution.

**Verification:**

After the sed batch, every remaining "Provender" mention in the
codebase was audited:
- 8 mentions in `network-explorer.tsx` — all code comments documenting
  preservation behavior and the future Provender product
- 5 mentions in `profile-fields.tsx` — all code comments about
  PRESERVED_OPERATOR_PERSONA_OPTIONS
- 2 mentions in `globals.css` — brand-palette history comment
- All `_preserved-for-provender/*` files — intentionally preserved as-is

Build passes. No active user-facing string says "Provender" anymore.

**Visible demo changes:**

- Every page title in the browser tab now starts with "Atlas".
- The wordmark in the top nav (and the footer) reads "Atlas." (with the
  amber period kept).
- Login, signup, complete-profile, reset-password pages all greet
  users with "Welcome to Atlas" / "Create your Atlas account" etc.
- The landing page's persona-keyed body copy now refers to Atlas as the
  thing that "starts where you are," "maps what's available," etc.
- Reports footer reads "Atlas · A Farmer's Share Corporation."
- Mailto links generate subject lines with "Atlas" instead of
  "Provender."
- Consent checkboxes on signup/profile read "Opt out of Atlas updates"
  and "Do not show me in the Atlas directory."

**Resurrection notes:**

This phase has no preservation in the "resurrection" sense — it's a
straight rename of user-facing strings. When Provender (the operator
product) ships, it will have its own UI, its own wordmark, its own
copy. The Atlas-named copy here doesn't need to be "resurrected" — it
stays Atlas-named because the Atlas surface stays Atlas.

If Pell ever renames Atlas (the working name was provisional pending
brand engagement), the same sed-batch pattern can rename everything
again in roughly five minutes.

**Resurrection trigger:** N/A (rename is permanent for Atlas).

---

## Entry 3 — Operator persona options preserved in signup form

**Date:** 2026-05-19
**Phase:** 4
**Status:** Preserved (in-place, exported alongside the active list)
**Author:** Claude (with Kelsey's long-leash go-ahead)

### The story

The signup form's persona dropdown previously offered every persona that
exists in the system — farmers, buyers, food hubs, policymakers, nonprofits,
funders, explorers. Three of those (farmer, buyer, hub) are operators in
the food economy: they run businesses inside the system that Atlas
*observes*. Atlas readers (cities, funders, nonprofits) study the food
system without operating in it, so a signup choice like "I'm a buyer
(institution, retail, food service…)" doesn't make sense for the Atlas
audience.

Per Kelsey's call: farmers *can* sign up for Atlas (their primary use
case is still further out — likely a white-label per-farmer build that's
a much-later phase), but buyers and food hubs really only make sense as
Provender users. So the active signup list keeps farmer, drops buyer and
hub.

The persona labels also got tightened to match the reader audience
language: "Government / public sector" became "Government / public sector /
food council" (food councils are a key Atlas audience and were previously
inferred under nonprofit, which wasn't quite right). "Nonprofit / food
council" simplified to "Nonprofit." "Funder / researcher" expanded to
"Funder / researcher / investor" so impact investors see themselves on
the dropdown.

The persona_t enum in the database is untouched. Every value (including
buyer, hub, farmer_paid, etc.) remains valid — we never drop enum values
per the schema discipline. The signup UI just doesn't expose buyer and
hub anymore.

### Tech specs

**Edits to `src/components/auth/profile-fields.tsx`:**

1. PERSONA_OPTIONS slimmed to reader-friendly options:
   - "Government / public sector / food council" → `policymaker`
   - "Nonprofit" → `nonprofit`
   - "Funder / researcher / investor" → `funder`
   - "Farmer / producer" → `farmer`
   - "Just exploring" → `explore`

2. Added new exported constant `PRESERVED_OPERATOR_PERSONA_OPTIONS`
   containing the buyer and hub options that were removed from
   PERSONA_OPTIONS. Lives in the same file so it's discoverable and
   typed identically.

3. Updated the inline comment block above PERSONA_OPTIONS to explain
   Atlas's reader-only framing and reference the preserved constant.

**What's NOT changed:**

- The `persona_t` enum in Supabase — values intact.
- `PERSONA_ENTRIES` in `persona-switcher.tsx` — still has the full set
  (admin users testing different personas need to see them; Atlas
  visibility of the switcher itself is gated in `page.tsx` already).
- Tier values like `farmer_paid`, `buyer_school`, `buyer_institutional`,
  `aggregator_licensed` — untouched in the SQL tier matrix files.

**Visible demo changes:**

- The persona dropdown on /signup and /complete-profile now shows 5
  reader options instead of 7 mixed reader/operator options.
- Anyone with an existing account whose persona is `buyer` or `hub`
  still works — only the future signup form changed; their stored
  persona value is still a valid enum value and continues to drive their
  default views.

**Resurrection notes for Provender's build sprint:**

1. Merge `PRESERVED_OPERATOR_PERSONA_OPTIONS` back into `PERSONA_OPTIONS`
   in `profile-fields.tsx`. The shape is identical so a spread works:
   `[...PERSONA_OPTIONS, ...PRESERVED_OPERATOR_PERSONA_OPTIONS]`.
2. Consider splitting persona options into product-specific sets if the
   multi-product UI architecture by then has separate signup flows for
   Atlas vs Provender. (Provender signup is likely an admin-curated
   "create this aggregator's account" flow rather than self-serve, in
   which case Provender doesn't even need a persona dropdown.)
3. The reader-audience label tightening (food council added to
   policymaker, investor added to funder) is probably right to keep
   even when operator options come back — review at resurrection time.

**Resurrection trigger:** Provender build sprint, Aug–Nov 2026.

---

## Entry 2 — Scope toggle and persona switcher gated for operators

**Date:** 2026-05-19
**Phase:** 3 (combined 3a + 3b)
**Status:** Preserved (in-place, gated behind a prop)
**Author:** Claude (with Kelsey's long-leash go-ahead)

### The story

This entry covers two operator-only UI surfaces that were too embedded to
physically move into the preservation folder. Instead they're preserved
**in place**, gated behind a single boolean prop. Atlas instances of the
explorer don't pass the prop (default off) and the operator UI doesn't
render. Provender's build sprint will flip the prop on and the operator
UI returns intact, exercised on every Atlas build in the meantime.

The first surface is the **foodshed ↔ "My organization" scope toggle** —
the single most important control in the original IA, because the "My
organization" mode was where Provender's subscription value moment lived
("here's the whole foodshed; here's just your operation"). For Atlas
readers (cities, funders, nonprofits, researchers) the "My organization"
mode makes no sense — they have no org represented in the system to scope
to. So Atlas hides the toggle entirely; readers only ever see the whole
foodshed.

The second surface is the **top-bar persona switcher** — a dropdown that
let anonymous URL-param visitors and admin users switch between persona
lenses (policymaker, farmer, buyer, hub, nonprofit, funder, etc.) for
demo purposes. Atlas has *one audience* (readers), so the switcher loses
its purpose: a city planner doesn't need to flip to "buyer view" mid-demo.
We hide it for everyone except `afs_internal` admin (who still need to
test different personas for QA). Anonymous visitors who want to preview a
specific reader view (`?persona=funder`) can still do so via URL — only
the UI control disappears.

The persona switcher itself stays imported by `page.tsx` and renders
under the admin condition. The component file `persona-switcher.tsx`
keeps its full PERSONA_ENTRIES list (including operator personas like
farmer/buyer/hub) — that list is what an admin would see when QAing the
old operator views. Phase 4 may revisit whether the operator entries
should be split out for further preservation discipline.

### Tech specs

**Edits to `src/components/farms/network-explorer.tsx`:**

1. Added a new sub-component `ScopeToggle` at the top of the file. It
   takes `scope`, `setScope`, and `showOrgMode` props. When `showOrgMode`
   is false, the component returns `null` (the entire toggle UI
   disappears, including the "Scope" label). When `showOrgMode` is true,
   the component renders the original two-button toggle plus the italic
   "Showing a sample of your-organization-shaped data" descriptor.

2. Replaced the inline scope-toggle JSX (was at lines 936-977) with
   `<ScopeToggle scope={scope} setScope={setScope}
   showOrgMode={showOperatorControls} />`.

3. Added a new `showOperatorControls?: boolean` prop to NetworkExplorer
   (default `false`). The prop is documented inline: it's the
   per-instance "this is the Provender instance, render operator UI"
   gate.

4. Updated `defaultCellForPersona`: operator personas (farmer, buyer,
   hub) only default to `scope: "org"` when `showOperatorControls` is
   true. In Atlas mode they default to `scope: "foodshed"` along with
   everyone else.

**Edits to `src/app/page.tsx`:**

1. Changed the persona-switcher visibility conditional from
   `persona && (!isLoggedIn || isAdmin)` to `persona && isAdmin`.
   Anonymous visitors no longer see the switcher UI. URL-param persona
   override still works for them; they just don't get the dropdown.

2. Added an inline comment explaining the visibility rule so a future
   reader understands why anon visitors lost the switcher.

**Note:** `page.tsx` doesn't pass `showOperatorControls` to its
`<NetworkExplorer>` instances — the default `false` applies. Atlas mode
in effect everywhere.

**Visible demo changes:**

- The scope toggle (the "Scope: The whole foodshed | My organization"
  control above the altitude row) disappears entirely. The altitude row
  is now the top control in the navigator card.
- The persona-switcher dropdown in the top-right nav disappears for
  anonymous visitors and signed-in non-admin users. Only `afs_internal`
  admin users see it.

**Resurrection notes for Provender's build sprint:**

1. In Provender's instance of `<NetworkExplorer>` (wherever it ends up
   in the Provender app), pass `showOperatorControls={true}`. That alone
   resurrects the scope toggle UI and restores operator persona default
   cells to org-scope.

2. In Provender's top nav (if it reuses page.tsx structure), restore
   the original conditional `(!isLoggedIn || isAdmin)` for the persona
   switcher — or whatever visibility rule Provender wants.

3. The PersonaSwitcher component itself doesn't need modification. Its
   PERSONA_ENTRIES still include the operator entries (farmer, buyer,
   hub), so once visibility is restored, the dropdown shows them again.

**Resurrection trigger:** Provender build sprint, Aug–Nov 2026.

---
