// Central registry of report types shown on the Reports tab. Each entry
// drives a card in the UI, a CSV download, and optionally a printable
// HTML page at /reports/<slug>. New reports added here will automatically
// surface in the tab — just implement the generator in csv-generators.ts
// and (optionally) add a narrative component under src/components/reports/.

export type ReportSlug =
  | "regional-supply"
  | "food-recovery"
  | "regen-cert-audit"
  | "procurement-readiness"
  | "gap-analysis"
  | "full-dataset";

export type ReportMeta = {
  slug: ReportSlug;
  name: string;
  description: string;
  hasNarrative: boolean; // true → has a /reports/<slug> HTML page
  primaryPersona: "policymaker" | "buyer" | "investor" | "afs" | "any";
};

export const REPORT_REGISTRY: ReportMeta[] = [
  {
    slug: "regional-supply",
    name: "Regional supply snapshot",
    description:
      "Farm count, crop coverage, certification mix, pipeline status. Download data as CSV or open the narrative report.",
    hasNarrative: true,
    primaryPersona: "buyer",
  },
  {
    slug: "food-recovery",
    name: "Food recovery report",
    description:
      "Diversion by category, lbs diverted, meals equivalent, recovery node coverage.",
    hasNarrative: false,
    primaryPersona: "policymaker",
  },
  {
    slug: "procurement-readiness",
    name: "Procurement readiness",
    description:
      "Enrolled farms matched to buyer requirements — volume, cert, geography, compliance docs.",
    hasNarrative: false,
    primaryPersona: "buyer",
  },
  {
    slug: "gap-analysis",
    name: "Gap analysis report",
    description:
      "Where buyers exist without supply and farms exist without channels. Unmet opportunities by county.",
    hasNarrative: true,
    primaryPersona: "policymaker",
  },
  {
    slug: "regen-cert-audit",
    name: "Regen certification audit",
    description:
      "All farms with verified regen claims, Scope-3 status, soil test dates, certification currency.",
    hasNarrative: false,
    primaryPersona: "investor",
  },
  {
    slug: "full-dataset",
    name: "Full dataset export",
    description:
      "All entities, relationships, certs, documents. CSV export for integration with existing systems.",
    hasNarrative: false,
    primaryPersona: "afs",
  },
];

export function getReport(slug: string): ReportMeta | null {
  return REPORT_REGISTRY.find((r) => r.slug === slug) ?? null;
}
