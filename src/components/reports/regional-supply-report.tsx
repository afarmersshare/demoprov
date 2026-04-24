"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ReportShell, ReportSection, ReportLoading } from "./report-shell";
import { computeComplianceInfo } from "@/components/farms/network-explorer";
import type {
  Farm,
  FarmCrop,
  ImpactDoc,
} from "@/components/farms/network-explorer";

const COMPLIANCE_LOOKUP_DOC_TYPES = [
  "food_safety_plan",
  "gap_cert",
  "gfsi_sqf",
  "gfsi_brc",
  "gfsi_primus",
  "haccp_plan",
  "water_test",
  "liability_insurance",
  "product_liability_insurance",
  "organic_cert",
  "real_organic_cert",
];

export function RegionalSupplyReport() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [farmCrops, setFarmCrops] = useState<FarmCrop[]>([]);
  const [impactDocs, setImpactDocs] = useState<ImpactDoc[]>([]);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase
        .from("farms")
        .select(
          "upid, name, farm_type, afs_member_status, acres_total, gross_revenue_baseline, gross_revenue_baseline_year, afs_priority_tier, county_fips, regenerative_claim_verified, scope3_platform, claim_risk_flags, attributes, geom_point",
        ),
      supabase
        .from("farm_crops")
        .select(
          "farm_upid, crop_type, crop_category, is_primary, production_method, season, acres, attributes",
        ),
      supabase
        .from("v_document_status")
        .select("node_upid, document_type, expires_date")
        .in("document_type", COMPLIANCE_LOOKUP_DOC_TYPES)
        .eq("is_current", true),
    ]).then((results) => {
      setLoading(false);
      const firstError = results.find((r) => r.error)?.error;
      if (firstError) {
        setError(firstError.message);
        return;
      }
      setFarms((results[0].data as Farm[]) ?? []);
      setFarmCrops((results[1].data as FarmCrop[]) ?? []);
      setImpactDocs((results[2].data as ImpactDoc[]) ?? []);
    });
  }, []);

  const summary = useMemo(() => {
    const enrolled = farms.filter((f) => f.afs_member_status === "enrolled");
    const engaged = farms.filter((f) => f.afs_member_status === "engaged");
    const prospect = farms.filter((f) => f.afs_member_status === "prospect");

    const totalAcres = enrolled.reduce((s, f) => s + (f.acres_total ?? 0), 0);

    const byCounty = new Map<string, number>();
    for (const f of enrolled) {
      const c =
        (f.attributes as { county_name?: string } | null)?.county_name ?? "";
      if (!c) continue;
      byCounty.set(c, (byCounty.get(c) ?? 0) + 1);
    }
    const countyRows = Array.from(byCounty.entries()).sort(
      (a, b) => b[1] - a[1],
    );

    const byType = new Map<string, number>();
    for (const f of enrolled) {
      const t = f.farm_type ?? "unspecified";
      byType.set(t, (byType.get(t) ?? 0) + 1);
    }
    const typeRows = Array.from(byType.entries()).sort((a, b) => b[1] - a[1]);

    const enrolledUpids = new Set(enrolled.map((f) => f.upid));
    const enrolledCrops = farmCrops.filter((c) => enrolledUpids.has(c.farm_upid));
    const cropCounts = new Map<string, number>();
    for (const c of enrolledCrops) {
      cropCounts.set(c.crop_type, (cropCounts.get(c.crop_type) ?? 0) + 1);
    }
    const cropRows = Array.from(cropCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    let buyerReady = 0;
    let close = 0;
    let needsWork = 0;
    for (const f of enrolled) {
      const info = computeComplianceInfo(f.upid, impactDocs);
      if (info.status === "buyer_ready") buyerReady += 1;
      else if (info.status === "close") close += 1;
      else needsWork += 1;
    }

    return {
      enrolled: enrolled.length,
      engaged: engaged.length,
      prospect: prospect.length,
      totalAcres: Math.round(totalAcres),
      countyRows,
      typeRows,
      cropRows,
      buyerReady,
      close,
      needsWork,
    };
  }, [farms, farmCrops, impactDocs]);

  if (loading) return <ReportLoading />;
  if (error) {
    return (
      <ReportShell title="Regional Supply Snapshot">
        <p className="text-accent-amber">
          Error loading report data: {error}
        </p>
      </ReportShell>
    );
  }

  return (
    <ReportShell
      title="Regional Supply Snapshot"
      subtitle={`A one-page view of enrolled farm supply, crop coverage, and buyer-readiness across the Louisville–Kentuckiana region. Generated for institutional buyers, food policy councils, and grantmakers.`}
    >
      <ReportSection title="At a glance">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCell
            num={summary.enrolled.toString()}
            label="Enrolled farms"
            sub={`${summary.engaged} engaged · ${summary.prospect} prospect`}
          />
          <StatCell
            num={summary.totalAcres.toLocaleString()}
            label="Acres in production"
            sub="Enrolled farms only"
          />
          <StatCell
            num={summary.buyerReady.toString()}
            label="Buyer-ready"
            sub={`${summary.close} close · ${summary.needsWork} need work`}
          />
          <StatCell
            num={summary.countyRows.length.toString()}
            label="Counties represented"
            sub="Across 11-county demo region"
          />
        </div>
      </ReportSection>

      <ReportSection title="Farms by county">
        <Table
          rows={summary.countyRows}
          leftHeader="County"
          rightHeader="Enrolled farms"
          max={Math.max(...summary.countyRows.map((r) => r[1]), 1)}
        />
      </ReportSection>

      <ReportSection title="Farms by operation type">
        <Table
          rows={summary.typeRows.map(([k, v]) => [formatSlug(k), v])}
          leftHeader="Operation type"
          rightHeader="Farms"
          max={Math.max(...summary.typeRows.map((r) => r[1]), 1)}
        />
      </ReportSection>

      <ReportSection title="Top crops across enrolled farms">
        <Table
          rows={summary.cropRows.map(([k, v]) => [formatSlug(k), v])}
          leftHeader="Crop"
          rightHeader="Farms growing"
          max={Math.max(...summary.cropRows.map((r) => r[1]), 1)}
        />
      </ReportSection>

      <ReportSection title="Compliance readiness">
        <p className="text-[14px] text-charcoal-soft leading-relaxed mb-4">
          &ldquo;Buyer-ready&rdquo; means the farm has current documentation
          across three categories institutional buyers require: a food-safety
          plan (or equivalent GAP / GFSI / HACCP), a recent water test, and
          liability insurance.
        </p>
        <div className="grid grid-cols-3 gap-3">
          <ReadinessCell label="Buyer-ready" n={summary.buyerReady} tint="ready" />
          <ReadinessCell label="1–2 docs short" n={summary.close} tint="close" />
          <ReadinessCell label="Needs work" n={summary.needsWork} tint="needs_work" />
        </div>
      </ReportSection>
    </ReportShell>
  );
}

function StatCell({
  num,
  label,
  sub,
}: {
  num: string;
  label: string;
  sub?: string;
}) {
  return (
    <div className="rounded-[8px] border border-cream-shadow bg-white p-4">
      <div className="font-display text-[28px] font-semibold text-charcoal leading-none tabular-nums">
        {num}
      </div>
      <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-charcoal-soft">
        {label}
      </div>
      {sub ? (
        <div className="mt-1 text-[11px] text-charcoal-soft/80">{sub}</div>
      ) : null}
    </div>
  );
}

function Table({
  rows,
  leftHeader,
  rightHeader,
  max,
}: {
  rows: Array<[string, number]>;
  leftHeader: string;
  rightHeader: string;
  max: number;
}) {
  return (
    <div className="border border-cream-shadow rounded-[8px] overflow-hidden">
      <div className="grid grid-cols-[1fr_auto] bg-cream/40 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-charcoal-soft">
        <span>{leftHeader}</span>
        <span>{rightHeader}</span>
      </div>
      {rows.map(([label, value], i) => (
        <div
          key={label}
          className={`grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-2.5 text-[13px] ${i < rows.length - 1 ? "border-b border-cream-shadow" : ""}`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-charcoal truncate">{label}</span>
            <div className="flex-1 h-1 bg-cream-shadow/50 rounded-full min-w-[40px] max-w-[200px]">
              <div
                className="h-full bg-slate-blue/70 rounded-full"
                style={{ width: `${(value / max) * 100}%` }}
              />
            </div>
          </div>
          <span className="font-semibold tabular-nums text-charcoal">
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}

function ReadinessCell({
  label,
  n,
  tint,
}: {
  label: string;
  n: number;
  tint: "ready" | "close" | "needs_work";
}) {
  const colorClass =
    tint === "ready"
      ? "text-forest-sage border-forest-sage/30 bg-forest-sage/5"
      : tint === "close"
        ? "text-accent-amber border-accent-amber/30 bg-accent-amber/5"
        : "text-mid-gray border-mid-gray/30 bg-mid-gray/5";
  return (
    <div className={`rounded-[8px] border p-4 text-center ${colorClass}`}>
      <div className="font-display text-[32px] font-semibold leading-none tabular-nums">
        {n}
      </div>
      <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em]">
        {label}
      </div>
    </div>
  );
}

function formatSlug(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
