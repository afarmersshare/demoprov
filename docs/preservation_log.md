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
