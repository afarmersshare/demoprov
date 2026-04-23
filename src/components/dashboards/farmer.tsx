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

function prettify(raw: string | null | undefined): string {
  if (!raw) return "—";
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
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

const WITHIN_MILES = 25;

export function FarmerDashboard({
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
  const [metric, setMetric] = useState<ChoroplethMetric>("farm_count");

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

  const countyCenter = useMemo(() => {
    const c = counties.find((c) => c.name === selectedCounty);
    return c?.geom_point?.coordinates ?? null;
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

  // Buyers in-county + within 25mi of county centroid
  const marketsInCounty = useMemo(
    () =>
      markets.filter(
        (m) => nearestCountyName(m.geom_point, counties) === selectedCounty,
      ),
    [markets, counties, selectedCounty],
  );

  const marketsWithinRadius = useMemo(() => {
    if (!countyCenter) return [] as Market[];
    return markets.filter((m) => {
      const pt = m.geom_point?.coordinates;
      if (!pt) return false;
      return haversineMiles(countyCenter, pt) <= WITHIN_MILES;
    });
  }, [markets, countyCenter]);

  const marketsByType = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of marketsWithinRadius) {
      const t = m.market_type || "unknown";
      map.set(t, (map.get(t) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [marketsWithinRadius]);

  // Processing access
  const processorsInCounty = useMemo(
    () =>
      processors.filter(
        (p) => nearestCountyName(p.geom_point, counties) === selectedCounty,
      ),
    [processors, counties, selectedCounty],
  );

  const processorsWithinRadius = useMemo(() => {
    if (!countyCenter) return [] as Processor[];
    return processors.filter((p) => {
      const pt = p.geom_point?.coordinates;
      if (!pt) return false;
      return haversineMiles(countyCenter, pt) <= WITHIN_MILES;
    });
  }, [processors, countyCenter]);

  const processorsByType = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of processorsWithinRadius) {
      const t = p.processor_type || "unknown";
      map.set(t, (map.get(t) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [processorsWithinRadius]);

  const processingCapacity = useMemo(() => {
    let total = 0;
    for (const p of processorsWithinRadius) {
      const cap = (p.attributes as { capacity_kg_per_day?: number } | null)
        ?.capacity_kg_per_day;
      if (typeof cap === "number") total += cap;
    }
    return total;
  }, [processorsWithinRadius]);

  // Support infrastructure — enablers in-county
  const enablersInCounty = useMemo(
    () =>
      enablers.filter(
        (e) => nearestCountyName(e.geom_point, counties) === selectedCounty,
      ),
    [enablers, counties, selectedCounty],
  );

  const enablersWithinRadius = useMemo(() => {
    if (!countyCenter) return [] as Enabler[];
    return enablers.filter((e) => {
      const pt = e.geom_point?.coordinates;
      if (!pt) return false;
      return haversineMiles(countyCenter, pt) <= WITHIN_MILES;
    });
  }, [enablers, countyCenter]);

  const enablersByType = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of enablersWithinRadius) {
      const t = e.enabler_type || "unknown";
      map.set(t, (map.get(t) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [enablersWithinRadius]);

  const afsActiveEnablerCount = useMemo(
    () =>
      enablersWithinRadius.filter(
        (e) =>
          (e.attributes as { afs_active?: boolean } | null)?.afs_active ===
          true,
      ).length,
    [enablersWithinRadius],
  );

  // Peer farms in-county — to see what neighbors grow
  const countyCrops = useMemo(() => {
    const farmUpids = new Set(countyFarms.map((f) => f.upid));
    return farmCrops.filter((c) => farmUpids.has(c.farm_upid));
  }, [farmCrops, countyFarms]);

  // Farms and recovery nodes within the farmer's sourcing ring — feeds ImpactCards.
  const farmsWithinRadius = useMemo(() => {
    if (!countyCenter) return [] as Farm[];
    return farms.filter((f) => {
      const pt = f.geom_point?.coordinates;
      if (!pt) return false;
      return haversineMiles(countyCenter, pt) <= WITHIN_MILES;
    });
  }, [farms, countyCenter]);

  const cropsWithinRadius = useMemo(() => {
    const farmUpids = new Set(farmsWithinRadius.map((f) => f.upid));
    return farmCrops.filter((c) => farmUpids.has(c.farm_upid));
  }, [farmCrops, farmsWithinRadius]);

  const recoveryWithinRadius = useMemo(() => {
    if (!countyCenter) return [] as RecoveryNode[];
    return recoveryNodes.filter((r) => {
      const pt = r.geom_point?.coordinates;
      if (!pt) return false;
      return haversineMiles(countyCenter, pt) <= WITHIN_MILES;
    });
  }, [recoveryNodes, countyCenter]);

  const cropRollup = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of countyCrops) {
      map.set(c.crop_type, (map.get(c.crop_type) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [countyCrops]);

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
          >
            <ToggleGroupItem value="farm_count">Farms</ToggleGroupItem>
            <ToggleGroupItem value="enrolled_pct">Enrolled %</ToggleGroupItem>
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
            If I farm in this county
          </div>
          <div className="font-display text-[24px] font-semibold text-moss leading-tight">
            {selectedCounty || "Pick a county above"}
          </div>
          <div className="mt-1.5 text-xs text-charcoal-soft">
            Within-radius numbers below use a {WITHIN_MILES}-mile ring from
            the county centroid.
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-7">
          {/* Market access */}
          <div className="rounded-[10px] border border-cream-shadow bg-cream/40 p-5">
            <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft mb-3">
              Where I could sell
            </div>
            <StatRow
              label="Buyers in-county"
              value={fmtInt(marketsInCounty.length)}
            />
            <StatRow
              label={`Buyers within ${WITHIN_MILES} mi`}
              value={fmtInt(marketsWithinRadius.length)}
            />
            <div className="mt-4 pt-4 border-t border-cream-shadow">
              <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-charcoal-soft mb-2">
                Buyer types nearby
              </div>
              {marketsByType.length === 0 ? (
                <div className="text-xs text-charcoal-soft italic">
                  No buyers in the ring.
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {marketsByType.slice(0, 5).map(([t, count]) => (
                    <li
                      key={t}
                      className="flex items-baseline justify-between text-sm"
                    >
                      <span className="text-charcoal">{prettify(t)}</span>
                      <span className="text-charcoal-soft tabular-nums font-mono text-xs">
                        {count}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Processing access */}
          <div className="rounded-[10px] border border-cream-shadow bg-cream/40 p-5">
            <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft mb-3">
              Processing I can reach
            </div>
            <StatRow
              label="Processors in-county"
              value={fmtInt(processorsInCounty.length)}
            />
            <StatRow
              label={`Processors within ${WITHIN_MILES} mi`}
              value={fmtInt(processorsWithinRadius.length)}
            />
            <StatRow
              label="Combined capacity"
              value={
                processingCapacity > 0
                  ? `${fmtInt(Math.round(processingCapacity))} kg/day`
                  : "—"
              }
            />
            <div className="mt-4 pt-4 border-t border-cream-shadow">
              <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-charcoal-soft mb-2">
                Processor types nearby
              </div>
              {processorsByType.length === 0 ? (
                <div className="text-xs text-terracotta leading-relaxed">
                  No processors in the ring. Any value-add travels.
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {processorsByType.map(([t, count]) => (
                    <li
                      key={t}
                      className="flex items-baseline justify-between text-sm"
                    >
                      <span className="text-charcoal">{prettify(t)}</span>
                      <span className="text-charcoal-soft tabular-nums font-mono text-xs">
                        {count}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Support infrastructure */}
          <div className="rounded-[10px] border border-cream-shadow bg-cream/40 p-5">
            <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft mb-3">
              Who supports farms here
            </div>
            <StatRow
              label="Support orgs in-county"
              value={fmtInt(enablersInCounty.length)}
            />
            <StatRow
              label={`Support orgs within ${WITHIN_MILES} mi`}
              value={fmtInt(enablersWithinRadius.length)}
            />
            <StatRow
              label="AFS-partner support orgs"
              value={fmtInt(afsActiveEnablerCount)}
            />
            <div className="mt-4 pt-4 border-t border-cream-shadow">
              <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-charcoal-soft mb-2">
                Types of support available
              </div>
              {enablersByType.length === 0 ? (
                <div className="text-xs text-terracotta leading-relaxed">
                  No support orgs in the ring — potential gap in the
                  ecosystem here.
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {enablersByType.map(([t, count]) => (
                    <li
                      key={t}
                      className="flex items-baseline justify-between text-sm"
                    >
                      <span className="text-charcoal">{prettify(t)}</span>
                      <span className="text-charcoal-soft tabular-nums font-mono text-xs">
                        {count}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="pt-5 border-t border-cream-shadow">
          <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft mb-3">
            What peers are growing in this county
          </div>
          {cropRollup.length === 0 ? (
            <div className="text-sm text-charcoal-soft italic">
              No farms seeded for this county.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {cropRollup.slice(0, 10).map(([c, count]) => (
                <span
                  key={c}
                  className="inline-flex items-baseline gap-1.5 px-3 py-1 rounded-full bg-bone text-sm text-charcoal"
                >
                  {prettify(c)}
                  <span className="text-[11px] text-charcoal-soft tabular-nums font-mono">
                    ×{count}
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      <ImpactCards
        farms={farmsWithinRadius}
        farmCrops={cropsWithinRadius}
        recoveryNodes={recoveryWithinRadius}
        impactDocs={impactDocs}
        scopeLabel={`within ${WITHIN_MILES} mi`}
      />
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 border-b border-cream-shadow last:border-b-0">
      <div className="text-sm text-charcoal-soft">{label}</div>
      <div className="text-sm text-charcoal font-semibold tabular-nums">
        {value}
      </div>
    </div>
  );
}
