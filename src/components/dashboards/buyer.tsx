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

const SOURCING_MILES = 30;

export function BuyerDashboard({
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

  // Farms in-county + within sourcing radius
  const countyFarms = useMemo(
    () =>
      farms.filter(
        (f) =>
          (f.attributes as { county_name?: string } | null)?.county_name ===
          selectedCounty,
      ),
    [farms, selectedCounty],
  );

  const farmsWithinRadius = useMemo(() => {
    if (!countyCenter) return [] as Farm[];
    return farms.filter((f) => {
      const pt = f.geom_point?.coordinates;
      if (!pt) return false;
      return haversineMiles(countyCenter, pt) <= SOURCING_MILES;
    });
  }, [farms, countyCenter]);

  const acresInRadius = farmsWithinRadius.reduce(
    (s, f) => s + (f.acres_total ?? 0),
    0,
  );

  // Crop rollup within sourcing radius — for buyer perspective
  const cropsInRadius = useMemo(() => {
    const farmUpids = new Set(farmsWithinRadius.map((f) => f.upid));
    return farmCrops.filter((c) => farmUpids.has(c.farm_upid));
  }, [farmCrops, farmsWithinRadius]);

  const categoryRollup = useMemo(() => {
    const map = new Map<string, { acres: number; crops: Set<string> }>();
    for (const c of cropsInRadius) {
      const cat = c.crop_category || "unknown";
      if (!map.has(cat)) {
        map.set(cat, { acres: 0, crops: new Set() });
      }
      const entry = map.get(cat)!;
      entry.acres += c.acres ?? 0;
      entry.crops.add(c.crop_type);
    }
    return Array.from(map.entries())
      .map(([category, v]) => ({
        category,
        acres: v.acres,
        crops: v.crops.size,
      }))
      .sort((a, b) => b.acres - a.acres);
  }, [cropsInRadius]);

  const topCrops = useMemo(() => {
    const map = new Map<string, { acres: number; farms: Set<string> }>();
    for (const c of cropsInRadius) {
      if (!map.has(c.crop_type)) {
        map.set(c.crop_type, { acres: 0, farms: new Set() });
      }
      const entry = map.get(c.crop_type)!;
      entry.acres += c.acres ?? 0;
      entry.farms.add(c.farm_upid);
    }
    return Array.from(map.entries())
      .map(([crop, v]) => ({
        crop,
        acres: v.acres,
        farms: v.farms.size,
      }))
      .sort((a, b) => b.acres - a.acres);
  }, [cropsInRadius]);

  // Season mix
  const seasonMix = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of cropsInRadius) {
      const s = c.season || "unknown";
      map.set(s, (map.get(s) ?? 0) + (c.acres ?? 0));
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [cropsInRadius]);

  // Peer buyers — same market_type in county
  const marketsInCounty = useMemo(
    () =>
      markets.filter(
        (m) => nearestCountyName(m.geom_point, counties) === selectedCounty,
      ),
    [markets, counties, selectedCounty],
  );

  const marketsByType = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of marketsInCounty) {
      const t = m.market_type || "unknown";
      map.set(t, (map.get(t) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [marketsInCounty]);

  // Enrolled supply % within radius — AFS-partnered farms buyers can lean on
  const enrolledInRadius = farmsWithinRadius.filter(
    (f) => f.afs_member_status === "enrolled",
  ).length;

  const recoveryWithinRadius = useMemo(() => {
    if (!countyCenter) return [] as RecoveryNode[];
    return recoveryNodes.filter((r) => {
      const pt = r.geom_point?.coordinates;
      if (!pt) return false;
      return haversineMiles(countyCenter, pt) <= SOURCING_MILES;
    });
  }, [recoveryNodes, countyCenter]);

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
            If I buy from this county
          </div>
          <div className="font-display text-[24px] font-semibold text-slate-blue leading-tight">
            {selectedCounty || "Pick a county above"}
          </div>
          <div className="mt-1.5 text-xs text-charcoal-soft">
            Supply numbers below use a {SOURCING_MILES}-mile sourcing ring
            from the county centroid.
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-7">
          {/* Local supply */}
          <div className="rounded-[10px] border border-cream-shadow bg-cream/40 p-5">
            <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft mb-3">
              Local supply in the ring
            </div>
            <StatRow
              label="Farms in-county"
              value={fmtInt(countyFarms.length)}
            />
            <StatRow
              label={`Farms within ${SOURCING_MILES} mi`}
              value={fmtInt(farmsWithinRadius.length)}
            />
            <StatRow
              label="AFS-enrolled farms in ring"
              value={fmtInt(enrolledInRadius)}
            />
            <StatRow
              label="Acres in production"
              value={fmtInt(Math.round(acresInRadius))}
            />
            {farmsWithinRadius.length === 0 ? (
              <div className="mt-4 text-xs text-forest-sage leading-relaxed">
                <b>Supply gap:</b> zero farms in the sourcing ring. This
                county is a buyer without nearby producers.
              </div>
            ) : null}
          </div>

          {/* Category mix */}
          <div className="rounded-[10px] border border-cream-shadow bg-cream/40 p-5">
            <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft mb-3">
              Categories available
            </div>
            {categoryRollup.length === 0 ? (
              <div className="text-sm text-charcoal-soft italic">
                Nothing growing in the ring.
              </div>
            ) : (
              <ul className="space-y-1.5">
                {categoryRollup.slice(0, 6).map((c) => (
                  <li
                    key={c.category}
                    className="flex items-baseline justify-between text-sm"
                  >
                    <span className="text-charcoal">
                      {prettify(c.category)}
                    </span>
                    <span className="text-charcoal-soft tabular-nums font-mono text-xs">
                      {fmtInt(Math.round(c.acres))} ac · {c.crops}{" "}
                      {c.crops === 1 ? "crop" : "crops"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 pt-4 border-t border-cream-shadow">
              <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-charcoal-soft mb-2">
                Season mix (by acres)
              </div>
              {seasonMix.length === 0 ? (
                <div className="text-xs text-charcoal-soft italic">—</div>
              ) : (
                <ul className="space-y-0.5 text-xs text-charcoal-soft">
                  {seasonMix.map(([s, acres]) => (
                    <li
                      key={s}
                      className="flex items-baseline justify-between"
                    >
                      <span>{prettify(s)}</span>
                      <span className="tabular-nums font-mono">
                        {fmtInt(Math.round(acres))} ac
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Peer buyers */}
          <div className="rounded-[10px] border border-cream-shadow bg-cream/40 p-5">
            <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft mb-3">
              Peer buyers in-county
            </div>
            <StatRow
              label="Total buyers in-county"
              value={fmtInt(marketsInCounty.length)}
            />
            <div className="mt-4 pt-4 border-t border-cream-shadow">
              <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-charcoal-soft mb-2">
                By buyer type
              </div>
              {marketsByType.length === 0 ? (
                <div className="text-xs text-charcoal-soft italic">
                  No other buyers here.
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {marketsByType.map(([t, count]) => (
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
            Top crops available in the ring
          </div>
          {topCrops.length === 0 ? (
            <div className="text-sm text-charcoal-soft italic">
              No supply in the ring.
            </div>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-1.5">
              {topCrops.slice(0, 10).map((c) => (
                <li
                  key={c.crop}
                  className="flex items-baseline justify-between text-sm border-b border-cream-shadow pb-1 last:border-b-0"
                >
                  <span className="text-charcoal">{prettify(c.crop)}</span>
                  <span className="text-charcoal-soft tabular-nums font-mono text-xs">
                    {fmtInt(Math.round(c.acres))} ac · {c.farms}{" "}
                    {c.farms === 1 ? "farm" : "farms"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <ImpactCards
        farms={farmsWithinRadius}
        farmCrops={cropsInRadius}
        recoveryNodes={recoveryWithinRadius}
        impactDocs={impactDocs}
        scopeLabel={`within ${SOURCING_MILES} mi`}
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
