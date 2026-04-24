"use client";

import { useMemo } from "react";
import type {
  Farm,
  FarmCrop,
  ImpactDoc,
} from "../farms/network-explorer";
import { computeComplianceInfo } from "../farms/network-explorer";

const DOC_LABEL: Record<string, string> = {
  organic_cert: "Organic cert",
  real_organic_cert: "Real Organic",
  gap_cert: "GAP cert",
  food_safety_plan: "FSMA plan",
  gfsi_sqf: "SQF",
  gfsi_brc: "BRCGS",
  gfsi_primus: "PrimusGFS",
  haccp_plan: "HACCP",
  water_test: "Water test",
  liability_insurance: "Liability",
  product_liability_insurance: "Product liability",
  soil_test: "Soil test",
  cover_crop_plan: "Cover crop plan",
  nrcs_conservation_practice_plan: "NRCS plan",
  usda_grant_award: "USDA grant",
};

function formatDocType(t: string): string {
  return DOC_LABEL[t] ?? t.replace(/_/g, " ");
}

export function MyFarmCard({
  farm,
  farmCrops,
  impactDocs,
}: {
  farm: Farm;
  farmCrops: FarmCrop[];
  impactDocs: ImpactDoc[];
}) {
  const stats = useMemo(() => {
    const myCrops = farmCrops.filter((c) => c.farm_upid === farm.upid);
    const activeCropTypes = Array.from(
      new Set(myCrops.map((c) => c.crop_type)),
    );

    const myDocs = impactDocs.filter((d) => d.node_upid === farm.upid);
    const uniqueDocTypes = Array.from(
      new Set(myDocs.map((d) => d.document_type)),
    );

    const compliance = computeComplianceInfo(farm.upid, impactDocs);

    const acres =
      farm.acres_total ??
      (farm.attributes as { acres_farmed?: number } | null)?.acres_farmed ??
      null;

    const countyName =
      (farm.attributes as { county_name?: string } | null)?.county_name ?? "—";

    const statusLabel = farm.afs_member_status
      ? farm.afs_member_status.charAt(0).toUpperCase() +
        farm.afs_member_status.slice(1)
      : "Unknown";

    return {
      acres,
      countyName,
      statusLabel,
      activeCropTypes,
      uniqueDocTypes,
      compliance,
    };
  }, [farm, farmCrops, impactDocs]);

  // Document coverage progress — count toward a notional "buyer readiness bundle"
  // of roughly 4 essential docs (food safety, water test, liability, one cert).
  const docTarget = 4;
  const docProgress = Math.min(stats.uniqueDocTypes.length / docTarget, 1);

  const hasCompliance = stats.compliance.missing.length === 0;
  const gapCount = stats.compliance.missing.length;

  return (
    <section className="rounded-[14px] border border-cream-shadow bg-white p-6 sm:p-8 shadow-sm">
      <div className="mb-5 flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft mb-1">
            My farm card
          </div>
          <div className="font-display text-[22px] font-semibold text-moss leading-tight">
            {farm.name}
          </div>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-moss/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-moss">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-moss" />
          {stats.statusLabel}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Acres */}
        <div className="rounded-[10px] border border-cream-shadow bg-cream/40 p-4">
          <div className="font-display text-[28px] font-semibold text-charcoal leading-none tabular-nums">
            {stats.acres != null ? stats.acres.toLocaleString() : "—"}
          </div>
          <div className="mt-2 text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft">
            Acres
          </div>
          <div className="mt-0.5 text-[11px] text-charcoal-soft/80 truncate">
            {stats.countyName}
          </div>
        </div>

        {/* Active crops */}
        <div className="rounded-[10px] border border-cream-shadow bg-cream/40 p-4">
          <div className="font-display text-[28px] font-semibold text-charcoal leading-none tabular-nums">
            {stats.activeCropTypes.length}
          </div>
          <div className="mt-2 text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft">
            Active crops
          </div>
          <div
            className="mt-0.5 text-[11px] text-charcoal-soft/80 truncate"
            title={stats.activeCropTypes.join(", ")}
          >
            {stats.activeCropTypes.length > 0
              ? stats.activeCropTypes
                  .slice(0, 3)
                  .map((c) => c.replace(/_/g, " "))
                  .join(", ") +
                (stats.activeCropTypes.length > 3
                  ? ` +${stats.activeCropTypes.length - 3}`
                  : "")
              : "None on file"}
          </div>
        </div>

        {/* Documents on file */}
        <div className="rounded-[10px] border border-cream-shadow bg-cream/40 p-4">
          <div className="font-display text-[28px] font-semibold text-charcoal leading-none tabular-nums">
            {stats.uniqueDocTypes.length}
          </div>
          <div className="mt-2 text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft">
            Documents on file
          </div>
          <div
            className="mt-0.5 text-[11px] text-charcoal-soft/80 truncate"
            title={stats.uniqueDocTypes.map(formatDocType).join(", ")}
          >
            {stats.uniqueDocTypes.length > 0
              ? stats.uniqueDocTypes.slice(0, 2).map(formatDocType).join(", ") +
                (stats.uniqueDocTypes.length > 2
                  ? ` +${stats.uniqueDocTypes.length - 2}`
                  : "")
              : "None yet"}
          </div>
          <div className="mt-2 h-1 rounded-full bg-cream-shadow/60 overflow-hidden">
            <div
              className="h-full bg-moss/80 rounded-full transition-all"
              style={{ width: `${docProgress * 100}%` }}
            />
          </div>
        </div>

        {/* Compliance gaps */}
        <div
          className={`rounded-[10px] border p-4 ${
            hasCompliance
              ? "border-moss/30 bg-moss/5"
              : "border-terracotta/30 bg-terracotta/5"
          }`}
        >
          <div
            className={`font-display text-[28px] font-semibold leading-none tabular-nums ${
              hasCompliance ? "text-moss" : "text-terracotta"
            }`}
          >
            {gapCount}
          </div>
          <div
            className={`mt-2 text-[11px] font-bold uppercase tracking-[0.1em] ${
              hasCompliance ? "text-moss" : "text-terracotta"
            }`}
          >
            {hasCompliance ? "Buyer-ready" : "Compliance gap"}
            {!hasCompliance && gapCount > 1 ? "s" : ""}
          </div>
          <div className="mt-0.5 text-[11px] text-charcoal-soft/80 truncate">
            {hasCompliance
              ? "All core docs current"
              : stats.compliance.missing.slice(0, 2).join(", ")}
          </div>
          <div className="mt-2 h-1 rounded-full bg-cream-shadow/60 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                hasCompliance ? "bg-moss/80" : "bg-terracotta/60"
              }`}
              style={{
                width: `${hasCompliance ? 100 : (gapCount / 3) * 90 + 10}%`,
              }}
            />
          </div>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-cream-shadow text-[11px] text-charcoal-soft/80 leading-relaxed">
        <b className="text-charcoal">What AFS is doing on your behalf:</b>{" "}
        {hasCompliance
          ? "You're buyer-ready. We're surfacing your farm to institutional buyers matched on certification, volume, and geography."
          : `We're flagging ${gapCount === 1 ? "this gap" : "these gaps"} in upcoming buyer conversations so you don't lose a deal over a doc you can fix in a week.`}
      </div>
    </section>
  );
}
