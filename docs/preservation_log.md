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
