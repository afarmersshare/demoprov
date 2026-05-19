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
