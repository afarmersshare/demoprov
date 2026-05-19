# _preserved-for-provender/

This folder holds components, copy, and configuration that were built for the
unified Provender platform but are not needed for **Atlas** — the reader product
that ships first.

## Why this folder exists

When Provender's build sprint begins (target: late Q2 / early Q3 2026, to
support AFS internal aggregation operations starting Aug–Nov 2026), the
operator-flavored work here gets **resurrected, not rebuilt**. The codebase
remembers what was done, who it was for, and how to plug it back in.

## The rules

1. **Nothing in this folder is imported by Atlas.** The Atlas surface
   (`src/app/`, `src/components/farms/`, etc.) treats this folder as if it
   doesn't exist.

2. **Files moved here keep their original structure.** Don't refactor on the
   way in. Move first, refactor on the way out — when Provender's build
   sprint can take advantage of what we've learned since.

3. **Every move is logged.** See `/docs/preservation_log.md` for the narrative
   record of what arrived here, when, and how to plug it back in.

4. **Don't delete from this folder.** If a preserved component is genuinely
   obsolete by the time Provender's build begins, that decision gets made
   then — with the context of what Provender actually needs — not now.

## Resurrection protocol

When Provender's build sprint starts:

1. Read `/docs/preservation_log.md` end to end to see what's here and why.
2. For each component you need, check whether the Survey-side dependencies
   (shared components in `src/components/farms/`, schema, RLS) have shifted
   since preservation. If yes, update the preserved file before resurrecting.
3. Move the file out of `_preserved-for-provender/` into its new Provender
   home (likely a separate `apps/provender/` or `src/components/provender/`
   directory depending on the monorepo decision at that time).
4. Update `/docs/preservation_log.md` with a "Resurrected" entry.

## Folder map (grows as phases land)

```
_preserved-for-provender/
├── README.md                    ← this file
│
│   (Phase 2 will add:)
├── landing-tab.tsx              personalized operator Landing
├── pipeline-tab.tsx             sales pipeline (afs_internal)
│
│   (Phase 4 will add:)
├── signup-options.ts            operator persona options
│
│   (Phase 5 will add:)
└── pricing-tiers/               unified-product tier display
```

For components that are too embedded to move cleanly (specifically the
persona switcher and scope-toggle "org" mode inside `network-explorer.tsx`),
the preservation strategy is **in-place conditionalization** — they live
inside their original file behind a `showOperatorControls` prop. See the
log entry for Phase 3 when that lands.
