"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ReportShell, ReportSection, ReportLoading } from "./report-shell";
import type { Farm, Region } from "@/components/farms/network-explorer";
import { COUNTY_DEMAND_INDICATOR } from "@/lib/reports/csv-generators";

type CountyRow = {
  name: string;
  supply: number;
  demand: number;
  gapPct: number;
};

export function GapAnalysisReport() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase
        .from("farms")
        .select(
          "upid, name, farm_type, afs_member_status, acres_total, gross_revenue_baseline, gross_revenue_baseline_year, afs_priority_tier, county_fips, regenerative_claim_verified, scope3_platform, claim_risk_flags, attributes, geom_point",
        ),
      supabase
        .from("regions")
        .select(
          "upid, name, region_type, fips_codes, description, attributes, geom_point, geom_boundary",
        ),
    ]).then((results) => {
      setLoading(false);
      const firstError = results.find((r) => r.error)?.error;
      if (firstError) {
        setError(firstError.message);
        return;
      }
      setFarms((results[0].data as Farm[]) ?? []);
      setRegions((results[1].data as Region[]) ?? []);
    });
  }, []);

  const rows: CountyRow[] = useMemo(() => {
    const counties = regions.filter((r) => r.region_type === "county");
    const supplyByCounty = new Map<string, number>();
    for (const f of farms) {
      if (f.afs_member_status !== "enrolled") continue;
      const c =
        (f.attributes as { county_name?: string } | null)?.county_name ?? "";
      if (!c) continue;
      supplyByCounty.set(c, (supplyByCounty.get(c) ?? 0) + 1);
    }
    return counties
      .map((c) => {
        const supply = supplyByCounty.get(c.name) ?? 0;
        const demand =
          COUNTY_DEMAND_INDICATOR[c.name] ?? Math.max(supply, 1) * 1.1;
        const gapPct = demand > 0 ? (supply - demand) / demand : 0;
        return { name: c.name, supply, demand, gapPct };
      })
      .filter((r) => r.supply + r.demand > 0)
      .sort((a, b) => a.gapPct - b.gapPct);
  }, [farms, regions]);

  if (loading) return <ReportLoading />;
  if (error) {
    return (
      <ReportShell title="Gap Analysis Report">
        <p className="text-terracotta">
          Error loading report data: {error}
        </p>
      </ReportShell>
    );
  }

  const gapCounties = rows.filter((r) => r.gapPct < 0);
  const surplusCounties = rows.filter((r) => r.gapPct >= 0);
  const worstGap = gapCounties[0];
  const totalGap = Math.round(
    gapCounties.reduce((s, r) => s + (r.demand - r.supply), 0),
  );

  return (
    <ReportShell
      title="Gap Analysis Report"
      subtitle="Counties where demand for local food exceeds the supply currently enrolled with AFS. Priority targets for enrollment, infrastructure investment, and grant-funded recruitment."
    >
      <ReportSection title="Summary">
        <p className="text-[14px] text-charcoal-soft leading-relaxed mb-4">
          Of <b className="text-charcoal">{rows.length} counties</b> in the
          demo region,{" "}
          <b className="text-terracotta">{gapCounties.length}</b> show a
          measurable gap between institutional / food-insecurity demand and
          the farm supply currently enrolled.{" "}
          <b className="text-moss">{surplusCounties.length}</b> counties are
          at or above their demand indicator.
        </p>
        {worstGap ? (
          <p className="text-[14px] text-charcoal-soft leading-relaxed">
            The largest single gap is in{" "}
            <b className="text-charcoal">{worstGap.name}</b> at{" "}
            <b className="text-terracotta">
              {(worstGap.gapPct * 100).toFixed(0)}%
            </b>{" "}
            under demand — roughly{" "}
            {Math.round(worstGap.demand - worstGap.supply)} additional
            enrolled farms&rsquo; worth of supply needed to close the gap.
          </p>
        ) : null}
        <p className="mt-4 text-[14px] text-charcoal-soft leading-relaxed">
          Total unmet demand across gap counties:{" "}
          <b className="text-charcoal">
            ~{totalGap} farm-equivalents
          </b>
          .
        </p>
      </ReportSection>

      <ReportSection title="Counties ordered by priority (worst gap first)">
        <div className="border border-cream-shadow rounded-[8px] overflow-hidden">
          <div className="grid grid-cols-[1fr_80px_80px_80px] bg-cream/40 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-charcoal-soft">
            <span>County</span>
            <span className="text-right">Supply</span>
            <span className="text-right">Demand</span>
            <span className="text-right">Gap/Surplus</span>
          </div>
          {rows.map((r, i) => {
            const isGap = r.gapPct < 0;
            return (
              <div
                key={r.name}
                className={`grid grid-cols-[1fr_80px_80px_80px] items-center gap-2 px-4 py-2.5 text-[13px] ${i < rows.length - 1 ? "border-b border-cream-shadow" : ""}`}
              >
                <span className="text-charcoal font-medium">{r.name}</span>
                <span className="text-right tabular-nums text-charcoal">
                  {r.supply}
                </span>
                <span className="text-right tabular-nums text-charcoal-soft">
                  {Math.round(r.demand)}
                </span>
                <span
                  className={`text-right tabular-nums font-semibold ${isGap ? "text-terracotta" : "text-moss"}`}
                >
                  {isGap ? "" : "+"}
                  {(r.gapPct * 100).toFixed(0)}%
                </span>
              </div>
            );
          })}
        </div>
      </ReportSection>

      <ReportSection title="Method">
        <p className="text-[13px] text-charcoal-soft leading-relaxed">
          <b className="text-charcoal">Supply</b> is the live count of farms
          with <span className="font-mono">afs_member_status = enrolled</span>{" "}
          per county from the Provender database.
        </p>
        <p className="mt-3 text-[13px] text-charcoal-soft leading-relaxed">
          <b className="text-charcoal">Demand</b> is an illustrative
          per-county indicator for the demo, combining institutional
          procurement commitments, USDA food access (food insecurity +
          food desert tract counts), and population density. The real
          build pulls these figures from live data sources; demo values
          are hardcoded to show the shape of the tool.
        </p>
        <p className="mt-3 text-[13px] text-charcoal-soft leading-relaxed">
          <b className="text-charcoal">Gap percentage</b> = (supply −
          demand) / demand. Negative values indicate unmet demand;
          positive values indicate counties with surplus enrolled supply
          relative to the demand indicator.
        </p>
      </ReportSection>
    </ReportShell>
  );
}
