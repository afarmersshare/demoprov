// Central palette for JS/canvas-drawn surfaces.
// CSS/Tailwind surfaces should prefer the `--color-*` tokens in globals.css,
// which mirror the values below. Keep the two in sync.

// Semantic data-viz colors (preserved under the main-site chrome swap — Option A).
export const MOSS = "#2f4a3a";
export const MOSS_LIGHT = "#456658";
export const AMBER = "#c77f2a";
export const AMBER_LIGHT = "#dca154";
export const TERRACOTTA = "#b86b4b";
export const CREAM = "#f7f3eb";
export const CREAM_SHADOW = "#e3dcc7";
export const BONE = "#e8e1d2";
export const CHARCOAL = "#1f2421";
export const CHARCOAL_SOFT = "#4a524e";

// Named aliases for amber's two brand-accent jobs.
// Both currently resolve to AMBER; split them if you ever want to drift one.
export const MARKET = AMBER;
export const REGION_BADGE = AMBER;

// Hub-node ring color — reads as centrality, not hierarchy.
export const SAGE = "#9caf88";

// Persona accent colors — one per landing-card lens.
export const PERSONA_COLOR = {
  policymaker: MOSS,
  afs: AMBER,
  farmer: "#6b9370",
  buyer: "#a14a2a",
  funder: "#bda2b9",
  explore: CHARCOAL_SOFT,
} as const;

// Main-site brand neutrals (mirrored from globals.css for canvas contexts).
export const INK = "#041215";
export const INK_MUTED = "#6c6c89";
export const HAIRLINE = "#e1e1e1";
export const ACCENT_MUSTARD = "#e8d833";
export const ACCENT_MAUVE = "#bda2b9";
