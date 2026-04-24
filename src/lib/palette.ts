// Central palette for JS/canvas-drawn surfaces.
// Mirrors the Pell brand tokens in globals.css (April 2026). The legacy
// export names (MOSS, AMBER, TERRACOTTA, BONE) are retained so that canvas
// and SVG components keep rendering — the hex values behind them now come
// from the Pell palette. Component-level Tailwind classes (bg-slate-blue,
// text-forest-sage, etc.) reach globals.css directly; this file is for
// anything drawn via inline style or canvas context.

// Pell canonical palette, exported with both Pell names and legacy aliases.
export const SLATE_BLUE = "#5B7B8A";
export const SLATE_BLUE_LIGHT = "#7A9BAD";
export const SLATE_MID = "#D0DDE3";
export const SLATE_PALE = "#EEF3F5";
export const FOREST_SAGE = "#4A6741";
export const WARM_CREAM = "#F7F3EC";
export const WARM_WHITE = "#FDFAF5";
export const WARM_CHARCOAL = "#2C2A27";
export const MID_GRAY = "#6B6763";
export const ACCENT_AMBER = "#B8860B";
export const RULE = "#D4CEC5";

// Legacy names preserved for canvas/svg consumers.
// Each points at its Pell equivalent per the Phase 4 palette mapping
// (moss→slate-blue, amber→accent-amber, terracotta→forest-sage, bone→rule).
export const MOSS = SLATE_BLUE;
export const MOSS_LIGHT = SLATE_BLUE_LIGHT;
export const AMBER = ACCENT_AMBER;
export const AMBER_LIGHT = "#D4A44E";
export const TERRACOTTA = FOREST_SAGE;
export const CREAM = WARM_CREAM;
export const CREAM_SHADOW = "#e3dcc7";
export const BONE = RULE;
export const CHARCOAL = WARM_CHARCOAL;
export const CHARCOAL_SOFT = MID_GRAY;

// Named aliases for amber's two brand-accent jobs.
export const MARKET = ACCENT_AMBER;
export const REGION_BADGE = ACCENT_AMBER;

// Hub-node ring color — reads as centrality, not hierarchy.
export const SAGE = FOREST_SAGE;

// Persona accent colors — one per landing-card lens. Reassigned to Pell
// palette (April 2026); funder keeps its mauve since Pell has no mauve-ish
// equivalent and the hue is distinct enough to stay readable.
export const PERSONA_COLOR = {
  policymaker: SLATE_BLUE,
  afs: FOREST_SAGE,
  farmer: SLATE_BLUE_LIGHT,
  buyer: ACCENT_AMBER,
  funder: "#bda2b9",
  explore: MID_GRAY,
} as const;

// Main-site brand neutrals (mirrored from globals.css for canvas contexts).
export const INK = "#041215";
export const INK_MUTED = "#6c6c89";
export const HAIRLINE = "#e1e1e1";
export const ACCENT_MUSTARD = "#e8d833";
export const ACCENT_MAUVE = "#bda2b9";
