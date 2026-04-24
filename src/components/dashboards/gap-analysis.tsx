"use client";

import { useMemo } from "react";
import type { Farm, Region } from "../farms/network-explorer";
import { COUNTY_DEMAND_INDICATOR } from "@/lib/reports/csv-generators";

type CountyGapRow = {
  county: string;
  supply: number;
  demand: number;
  gapPct: number; // negative = shortfall, positive = surplus
};

export function GapAnalysis({
  farms,
  regions,
}: {
  farms: Farm[];
  regions: Region[];
}) {
  const { rows, maxValue } = useMemo(() => {
    const counties = regions.filter((r) => r.region_type === "county");
    const supplyByCounty = new Map<string, number>();
    for (const f of farms) {
      if (f.afs_member_status !== "enrolled") continue;
      const county = (f.attributes as { county_name?: string } | null)
        ?.county_name;
      if (!county) continue;
      supplyByCounty.set(county, (supplyByCounty.get(county) ?? 0) + 1);
    }

    const rowsOut: CountyGapRow[] = counties
      .map((c) => {
        const supply = supplyByCounty.get(c.name) ?? 0;
        const demand =
          COUNTY_DEMAND_INDICATOR[c.name] ?? Math.max(supply, 1) * 1.1;
        const gapPct = demand > 0 ? (supply - demand) / demand : 0;
        return { county: c.name, supply, demand, gapPct };
      })
      .filter((r) => r.supply + r.demand > 0)
      .sort((a, b) => a.gapPct - b.gapPct);

    const max = Math.max(
      ...rowsOut.map((r) => Math.max(r.supply, r.demand)),
      1,
    );
    return { rows: rowsOut, maxValue: max };
  }, [farms, regions]);

  if (rows.length === 0) {
    return null;
  }

  const countiesWithGap = rows.filter((r) => r.gapPct < 0).length;

  return (
    <section className="rounded-[14px] border border-cream-shadow bg-white p-6 sm:p-8 shadow-sm">
      <div className="mb-6 flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft mb-1">
            Gap analysis — supply vs demand by county
          </div>
          <div className="font-display text-[20px] font-semibold text-moss leading-tight">
            Where the system has unmet need.
          </div>
          <div className="mt-1 text-[12px] text-charcoal-soft leading-relaxed max-w-prose">
            Enrolled farms per county versus illustrative institutional
            and food-insecurity demand. Counties in red show where demand
            exceeds the supply currently enrolled with AFS —{" "}
            <b className="text-terracotta font-semibold">
              {countiesWithGap} of {rows.length}
            </b>{" "}
            counties have a measurable gap.
          </div>
        </div>
        <span className="inline-block text-[10px] text-charcoal-soft/70 italic border border-cream-shadow rounded-full px-2.5 py-1 shrink-0">
          Demand figures illustrative
        </span>
      </div>

      <div className="space-y-3">
        {rows.map((r) => (
          <GapRow key={r.county} row={r} maxValue={maxValue} />
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-cream-shadow flex gap-6 flex-wrap text-[11px]">
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-6 bg-moss/90 rounded-sm" />
          <span className="text-charcoal-soft">Supply — enrolled farms</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-6 bg-terracotta/60 rounded-sm" />
          <span className="text-charcoal-soft">Unmet demand</span>
        </div>
        <div className="flex items-center gap-2 text-charcoal-soft/70 italic">
          Ordered worst-gap to largest-surplus.
        </div>
      </div>
    </section>
  );
}

function GapRow({
  row,
  maxValue,
}: {
  row: CountyGapRow;
  maxValue: number;
}) {
  const isGap = row.gapPct < 0;
  const supplyWidth = (row.supply / maxValue) * 100;
  const demandWidth = (row.demand / maxValue) * 100;

  return (
    <div className="grid grid-cols-[128px_1fr_86px] items-center gap-4">
      <span className="text-[13px] font-medium text-charcoal truncate">
        {row.county}
      </span>
      <div className="relative h-7" title={`Supply ${row.supply} · demand ${Math.round(row.demand)}`}>
        {/* Demand ghost as background */}
        <div
          className="absolute inset-y-0 left-0 bg-cream-shadow/60 rounded-sm"
          style={{ width: `${demandWidth}%` }}
        />
        {/* Supply bar (always moss) */}
        <div
          className="absolute inset-y-0 left-0 bg-moss/90 rounded-sm"
          style={{ width: `${supplyWidth}%` }}
        />
        {/* Gap extension (terracotta) only when supply < demand */}
        {isGap ? (
          <div
            className="absolute inset-y-0 bg-terracotta/60 rounded-sm"
            style={{
              left: `${supplyWidth}%`,
              width: `${Math.max(demandWidth - supplyWidth, 0)}%`,
            }}
          />
        ) : null}
      </div>
      <span
        className={`text-[12px] font-semibold tabular-nums text-right ${
          isGap ? "text-terracotta" : "text-moss"
        }`}
      >
        {isGap ? "" : "+"}
        {(row.gapPct * 100).toFixed(0)}%
        <span className="ml-1 text-[10px] font-normal text-charcoal-soft/70">
          {isGap ? "gap" : "surplus"}
        </span>
      </span>
    </div>
  );
}
