"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type {
  Farm,
  Market,
  Processor,
  RecoveryNode,
  Enabler,
  Region,
  FarmCrop,
  ImpactDoc,
  NetworkEntity,
} from "../farms/network-explorer";
import {
  PolicymakerMap,
  type ChoroplethMetric,
} from "./policymaker-map";
import { ImpactCards } from "./impact-cards";
import { GapAnalysis } from "./gap-analysis";

type Props = {
  farms: Farm[];
  markets: Market[];
  processors: Processor[];
  recoveryNodes: RecoveryNode[];
  enablers: Enabler[];
  regions: Region[];
  farmCrops: FarmCrop[];
  impactDocs: ImpactDoc[];
  selected: NetworkEntity | null;
  onSelect: (e: NetworkEntity | null) => void;
};

function fmtInt(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString();
}

function fmtPct(n: number | null | undefined, digits = 0): string {
  if (n == null) return "—";
  return `${(n * 100).toFixed(digits)}%`;
}

function prettify(raw: string | null | undefined): string {
  if (!raw) return "—";
  return raw.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

function haversineMiles(
  a: [number, number],
  b: [number, number],
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 3958.8;
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const h =
    s1 * s1 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * s2 * s2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function nearestCountyName(
  point: { coordinates: [number, number] } | null | undefined,
  counties: Region[],
): string {
  if (!point || counties.length === 0) return "";
  let bestName = "";
  let bestDist = Infinity;
  for (const c of counties) {
    const pt = c.geom_point?.coordinates;
    if (!pt) continue;
    const d = haversineMiles(point.coordinates, pt);
    if (d < bestDist) {
      bestDist = d;
      bestName = c.name;
    }
  }
  return bestName;
}

export function AfsDashboard({
  farms,
  markets,
  processors,
  recoveryNodes,
  enablers,
  regions,
  farmCrops,
  impactDocs,
  selected,
  onSelect,
}: Props) {
  const [selectedCounty, setSelectedCounty] = useState<string>("");
  const [metric, setMetric] = useState<ChoroplethMetric>("enrolled_pct");

  const counties = useMemo(
    () =>
      regions
        .filter((r) => r.region_type === "county")
        .sort((a, b) => a.name.localeCompare(b.name)),
    [regions],
  );

  useEffect(() => {
    if (!selectedCounty && counties.length > 0) {
      const louisville = counties.find((c) =>
        c.name.startsWith("Jefferson County"),
      );
      setSelectedCounty((louisville ?? counties[0]).name);
    }
  }, [counties, selectedCounty]);

  const countyFarms = useMemo(
    () =>
      farms.filter(
        (f) =>
          (f.attributes as { county_name?: string } | null)?.county_name ===
          selectedCounty,
      ),
    [farms, selectedCounty],
  );

  const countyProcessors = useMemo(
    () =>
      processors.filter(
        (p) => nearestCountyName(p.geom_point, counties) === selectedCounty,
      ),
    [processors, selectedCounty, counties],
  );

  const countyRecovery = useMemo(
    () =>
      recoveryNodes.filter(
        (r) => nearestCountyName(r.geom_point, counties) === selectedCounty,
      ),
    [recoveryNodes, selectedCounty, counties],
  );

  const countyCrops = useMemo(() => {
    const farmUpids = new Set(countyFarms.map((f) => f.upid));
    return farmCrops.filter((c) => farmUpids.has(c.farm_upid));
  }, [farmCrops, countyFarms]);

  // Pipeline stats — selected county
  const prospectsInCounty = countyFarms.filter(
    (f) => f.afs_member_status === "prospect",
  ).length;
  const engagedInCounty = countyFarms.filter(
    (f) => f.afs_member_status === "engaged",
  ).length;
  const enrolledInCounty = countyFarms.filter(
    (f) => f.afs_member_status === "enrolled",
  ).length;

  // Pipeline stats — metro
  const metroProspects = farms.filter(
    (f) => f.afs_member_status === "prospect",
  ).length;
  const metroEngaged = farms.filter(
    (f) => f.afs_member_status === "engaged",
  ).length;
  const metroEnrolled = farms.filter(
    (f) => f.afs_member_status === "enrolled",
  ).length;
  const metroTotal = metroProspects + metroEngaged + metroEnrolled;
  const metroEnrolledPct = metroTotal > 0 ? metroEnrolled / metroTotal : 0;

  // Priority tier distribution in selected county
  const tiersInCounty = useMemo(() => {
    const map = new Map<string, number>();
    for (const f of countyFarms) {
      const t = f.afs_priority_tier || "untiered";
      map.set(t, (map.get(t) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [countyFarms]);

  // Recruitment gaps — counties with zero enrolled farms
  const recruitmentGaps = useMemo(() => {
    const byCounty = new Map<string, number>();
    for (const f of farms) {
      const c =
        (f.attributes as { county_name?: string } | null)?.county_name;
      if (!c) continue;
      if (f.afs_member_status === "enrolled") {
        byCounty.set(c, (byCounty.get(c) ?? 0) + 1);
      } else if (!byCounty.has(c)) {
        byCounty.set(c, 0);
      }
    }
    return counties
      .map((c) => ({
        name: c.name,
        enrolled: byCounty.get(c.name) ?? 0,
        total: farms.filter(
          (f) =>
            (f.attributes as { county_name?: string } | null)?.county_name ===
            c.name,
        ).length,
      }))
      .filter((r) => r.total > 0 && r.enrolled === 0)
      .sort((a, b) => b.total - a.total);
  }, [counties, farms]);

  // Processor capacity in county (kg/day combined)
  const countyProcessorCapacity = useMemo(() => {
    let total = 0;
    for (const p of countyProcessors) {
      const cap = (p.attributes as { capacity_kg_per_day?: number } | null)
        ?.capacity_kg_per_day;
      if (typeof cap === "number") total += cap;
    }
    return total;
  }, [countyProcessors]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft">
            Color counties by
          </label>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={metric}
            onValueChange={(v) => {
              if (v) setMetric(v as ChoroplethMetric);
            }}
            className="flex-wrap !w-full sm:!w-fit"
          >
            <ToggleGroupItem value="enrolled_pct">Enrolled %</ToggleGroupItem>
            <ToggleGroupItem value="farm_count">Total farms</ToggleGroupItem>
            <ToggleGroupItem value="food_insecurity">
              Food insecurity
            </ToggleGroupItem>
            <ToggleGroupItem value="food_deserts">Food deserts</ToggleGroupItem>
            <ToggleGroupItem value="regenerative_acres">
              Regen acres
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft">
            County
          </label>
          <Select value={selectedCounty} onValueChange={setSelectedCounty}>
            <SelectTrigger className="min-w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {counties.map((c) => (
                <SelectItem key={c.upid} value={c.name}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <PolicymakerMap
        regions={regions}
        farms={farms}
        farmCrops={farmCrops}
        markets={markets}
        processors={processors}
        recoveryNodes={recoveryNodes}
        enablers={enablers}
        selectedCounty={selectedCounty}
        onSelectCounty={setSelectedCounty}
        metric={metric}
        selectedEntity={selected}
        onSelectEntity={onSelect}
      />

      <section className="rounded-[14px] border border-cream-shadow bg-white p-6 sm:p-8 shadow-sm">
        <div className="mb-6">
          <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft mb-1">
            Operational view
          </div>
          <div className="font-display text-[24px] font-semibold text-slate-blue leading-tight">
            {selectedCounty || "Pick a county above"}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-7">
          {/* Pipeline funnel */}
          <div className="rounded-[10px] border border-cream-shadow bg-cream/40 p-5">
            <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft mb-3">
              Pipeline funnel — this county
            </div>
            <FunnelBar
              enrolled={enrolledInCounty}
              engaged={engagedInCounty}
              prospect={prospectsInCounty}
            />
            <div className="mt-4 pt-4 border-t border-cream-shadow">
              <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-charcoal-soft mb-2">
                Metro-wide benchmark
              </div>
              <div className="text-xs text-charcoal-soft space-y-0.5">
                <div>
                  {fmtInt(metroTotal)} farms total · {fmtPct(metroEnrolledPct)}{" "}
                  enrolled
                </div>
                <div>
                  Prospect {fmtInt(metroProspects)} · Engaged{" "}
                  {fmtInt(metroEngaged)} · Enrolled {fmtInt(metroEnrolled)}
                </div>
              </div>
            </div>
            {countyFarms.length > 0 && enrolledInCounty === 0 ? (
              <div className="mt-4 text-xs text-forest-sage leading-relaxed">
                <b>Recruitment gap:</b> {countyFarms.length} farms here, zero
                enrolled yet.
              </div>
            ) : null}
          </div>

          {/* Priority tier distribution */}
          <div className="rounded-[10px] border border-cream-shadow bg-cream/40 p-5">
            <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft mb-3">
              Priority tier mix
            </div>
            {tiersInCounty.length === 0 ? (
              <div className="text-sm text-charcoal-soft italic">
                No farms in this county.
              </div>
            ) : (
              <ul className="space-y-1.5">
                {tiersInCounty.map(([tier, count]) => (
                  <li
                    key={tier}
                    className="flex items-baseline justify-between text-sm"
                  >
                    <span className="text-charcoal">{prettify(tier)}</span>
                    <span className="text-charcoal-soft tabular-nums font-mono text-xs">
                      {count} {count === 1 ? "farm" : "farms"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Processor bottleneck */}
          <div className="rounded-[10px] border border-cream-shadow bg-cream/40 p-5">
            <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft mb-3">
              Processing capacity
            </div>
            <div className="flex items-baseline justify-between py-1.5 border-b border-cream-shadow text-sm">
              <span className="text-charcoal-soft">Processors in-county</span>
              <span className="text-charcoal font-semibold tabular-nums">
                {fmtInt(countyProcessors.length)}
              </span>
            </div>
            <div className="flex items-baseline justify-between py-1.5 border-b border-cream-shadow text-sm">
              <span className="text-charcoal-soft">Combined capacity</span>
              <span className="text-charcoal font-semibold tabular-nums">
                {countyProcessorCapacity > 0
                  ? `${fmtInt(Math.round(countyProcessorCapacity))} kg/day`
                  : "—"}
              </span>
            </div>
            <div className="flex items-baseline justify-between py-1.5 text-sm">
              <span className="text-charcoal-soft">Farms producing here</span>
              <span className="text-charcoal font-semibold tabular-nums">
                {fmtInt(countyFarms.length)}
              </span>
            </div>
            {countyProcessors.length === 0 && countyFarms.length > 0 ? (
              <div className="mt-4 text-xs text-forest-sage leading-relaxed">
                <b>Processing bottleneck:</b> farms but no processor in-county.
                All throughput has to travel.
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <ImpactCards
        farms={countyFarms}
        farmCrops={countyCrops}
        recoveryNodes={countyRecovery}
        impactDocs={impactDocs}
        scopeLabel={selectedCounty || "selected county"}
      />

      <GapAnalysis farms={farms} regions={regions} />

      {recruitmentGaps.length > 0 ? (
        <section className="rounded-[14px] border border-cream-shadow bg-white p-6 sm:p-8 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft mb-3">
            Counties with zero enrolled farms
          </div>
          <div className="font-display text-[20px] font-semibold text-slate-blue mb-4">
            Recruitment opportunities
          </div>
          <ul className="space-y-1.5">
            {recruitmentGaps.map((r) => (
              <li
                key={r.name}
                className="flex items-baseline justify-between text-sm border-b border-cream-shadow pb-1.5 last:border-b-0"
              >
                <button
                  type="button"
                  onClick={() => setSelectedCounty(r.name)}
                  className="text-charcoal hover:text-slate-blue hover:underline text-left"
                >
                  {r.name}
                </button>
                <span className="text-charcoal-soft tabular-nums font-mono text-xs">
                  {r.total} {r.total === 1 ? "farm" : "farms"} · 0 enrolled
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function FunnelBar({
  enrolled,
  engaged,
  prospect,
}: {
  enrolled: number;
  engaged: number;
  prospect: number;
}) {
  const total = enrolled + engaged + prospect;
  if (total === 0) {
    return (
      <div className="text-sm text-charcoal-soft italic">
        No farms in this county.
      </div>
    );
  }
  const pct = (n: number) => `${((n / total) * 100).toFixed(0)}%`;
  return (
    <>
      <div className="flex h-3 w-full rounded-full overflow-hidden bg-cream-deep mb-3">
        {enrolled > 0 ? (
          <div
            className="bg-forest-sage"
            style={{ width: `${(enrolled / total) * 100}%` }}
          />
        ) : null}
        {engaged > 0 ? (
          <div
            className="bg-accent-amber"
            style={{ width: `${(engaged / total) * 100}%` }}
          />
        ) : null}
        {prospect > 0 ? (
          <div
            className="bg-slate-blue-light"
            style={{ width: `${(prospect / total) * 100}%` }}
          />
        ) : null}
      </div>
      <div className="space-y-1 text-sm">
        <FunnelRow
          dot="bg-forest-sage"
          label="Enrolled"
          count={enrolled}
          pct={pct(enrolled)}
        />
        <FunnelRow
          dot="bg-accent-amber"
          label="Engaged"
          count={engaged}
          pct={pct(engaged)}
        />
        <FunnelRow
          dot="bg-slate-blue-light"
          label="Prospect"
          count={prospect}
          pct={pct(prospect)}
        />
      </div>
    </>
  );
}

function FunnelRow({
  dot,
  label,
  count,
  pct,
}: {
  dot: string;
  label: string;
  count: number;
  pct: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={`inline-block w-2 h-2 rounded-full ${dot}`} />
      <span className="flex-1 text-charcoal">{label}</span>
      <span className="text-charcoal-soft tabular-nums font-mono text-xs">
        {count} · {pct}
      </span>
    </div>
  );
}
