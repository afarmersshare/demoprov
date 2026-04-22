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
  NetworkEntity,
} from "../farms/network-explorer";
import {
  PolicymakerMap,
  type ChoroplethMetric,
} from "./policymaker-map";

type Props = {
  farms: Farm[];
  markets: Market[];
  processors: Processor[];
  recoveryNodes: RecoveryNode[];
  enablers: Enabler[];
  regions: Region[];
  farmCrops: FarmCrop[];
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

function fmtMoney(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function prettifyCrop(raw: string): string {
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

export function PolicymakerDashboard({
  farms,
  markets,
  processors,
  recoveryNodes,
  enablers,
  regions,
  farmCrops,
  selected,
  onSelect,
}: Props) {
  const [selectedCounty, setSelectedCounty] = useState<string>("");
  const [metric, setMetric] = useState<ChoroplethMetric>("food_insecurity");

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

  const county = counties.find((c) => c.name === selectedCounty) ?? null;
  const countyAttrs = (county?.attributes ?? {}) as Record<string, unknown>;

  const countyFarms = useMemo(
    () =>
      farms.filter(
        (f) =>
          (f.attributes as { county_name?: string } | null)?.county_name ===
          selectedCounty,
      ),
    [farms, selectedCounty],
  );

  const countyCrops = useMemo(() => {
    const farmUpids = new Set(countyFarms.map((f) => f.upid));
    return farmCrops.filter((c) => farmUpids.has(c.farm_upid));
  }, [farmCrops, countyFarms]);

  const cropRollup = useMemo(() => {
    const map = new Map<string, { acres: number; farms: Set<string> }>();
    for (const c of countyCrops) {
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
  }, [countyCrops]);

  const totalAcresInProd = countyFarms.reduce(
    (s, f) => s + (f.acres_total ?? 0),
    0,
  );
  const enrolledFarms = countyFarms.filter(
    (f) => f.afs_member_status === "enrolled",
  ).length;
  const enrolledPct =
    countyFarms.length > 0 ? enrolledFarms / countyFarms.length : null;

  const metroFoodInsec = useMemo(() => {
    let total = 0;
    let n = 0;
    for (const c of counties) {
      const a = (c.attributes ?? {}) as { food_insecurity_rate?: number };
      if (typeof a.food_insecurity_rate === "number") {
        total += a.food_insecurity_rate;
        n += 1;
      }
    }
    return n > 0 ? total / n : null;
  }, [counties]);

  const countyMarkets = useMemo(
    () =>
      markets.filter(
        (m) => nearestCountyName(m.geom_point, counties) === selectedCounty,
      ),
    [markets, selectedCounty, counties],
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

  const countyEnablers = useMemo(
    () =>
      enablers.filter(
        (e) => nearestCountyName(e.geom_point, counties) === selectedCounty,
      ),
    [enablers, selectedCounty, counties],
  );

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
            <ToggleGroupItem value="food_insecurity">
              Food insecurity
            </ToggleGroupItem>
            <ToggleGroupItem value="farm_count">Farms</ToggleGroupItem>
            <ToggleGroupItem value="enrolled_pct">Enrolled %</ToggleGroupItem>
            <ToggleGroupItem value="food_deserts">Food deserts</ToggleGroupItem>
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
            Food system snapshot
          </div>
          <div className="font-display text-[24px] font-semibold text-moss leading-tight">
            {selectedCounty || "Pick a county above"}
          </div>
        </div>

        {county ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-7">
              {/* Community */}
              <div className="rounded-[10px] border border-cream-shadow bg-cream/40 p-5">
                <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft mb-3">
                  Community
                </div>
                <StatRow
                  label="Population"
                  value={fmtInt(
                    countyAttrs.population as number | undefined,
                  )}
                />
                <StatRow
                  label="Median household income"
                  value={fmtMoney(
                    countyAttrs.median_household_income as
                      | number
                      | undefined,
                  )}
                />
                <StatRow
                  label="Poverty rate"
                  value={fmtPct(countyAttrs.poverty_rate as number | undefined)}
                />
                <StatRow
                  label="Food-insecurity rate"
                  value={fmtPct(
                    countyAttrs.food_insecurity_rate as number | undefined,
                  )}
                  context={
                    typeof countyAttrs.food_insecurity_rate === "number" &&
                    metroFoodInsec != null
                      ? (countyAttrs.food_insecurity_rate as number) >
                        metroFoodInsec
                        ? "Above metro average"
                        : (countyAttrs.food_insecurity_rate as number) <
                            metroFoodInsec
                          ? "Below metro average"
                          : undefined
                      : undefined
                  }
                />
                <StatRow
                  label="SNAP participation"
                  value={fmtPct(
                    countyAttrs.snap_participation_rate as number | undefined,
                  )}
                />
                <StatRow
                  label="Food-desert tracts"
                  value={fmtInt(
                    countyAttrs.food_desert_tract_count as number | undefined,
                  )}
                />
              </div>

              {/* Production */}
              <div className="rounded-[10px] border border-cream-shadow bg-cream/40 p-5">
                <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft mb-3">
                  Food production
                </div>
                <StatRow label="Farms" value={fmtInt(countyFarms.length)} />
                <StatRow
                  label="Acres in production"
                  value={fmtInt(Math.round(totalAcresInProd))}
                />
                <StatRow
                  label="% enrolled with AFS"
                  value={fmtPct(enrolledPct)}
                />
                <StatRow
                  label="Crop types grown"
                  value={fmtInt(cropRollup.length)}
                />
                <div className="mt-4 pt-4 border-t border-cream-shadow">
                  <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-charcoal-soft mb-2">
                    Top crops by acreage
                  </div>
                  {cropRollup.length === 0 ? (
                    <div className="text-xs text-charcoal-soft/80 italic">
                      No crops seeded for this county.
                    </div>
                  ) : (
                    <ul className="space-y-1.5">
                      {cropRollup.slice(0, 5).map((c) => (
                        <li
                          key={c.crop}
                          className="flex items-baseline justify-between text-sm"
                        >
                          <span className="text-charcoal">
                            {prettifyCrop(c.crop)}
                          </span>
                          <span className="text-charcoal-soft tabular-nums font-mono text-xs">
                            {fmtInt(Math.round(c.acres))} ac · {c.farms}{" "}
                            {c.farms === 1 ? "farm" : "farms"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Infrastructure */}
              <div className="rounded-[10px] border border-cream-shadow bg-cream/40 p-5">
                <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft mb-3">
                  Infrastructure & buyers
                </div>
                <StatRow
                  label="Markets / buyers"
                  value={fmtInt(countyMarkets.length)}
                />
                <StatRow
                  label="Processors"
                  value={fmtInt(countyProcessors.length)}
                />
                <StatRow
                  label="Recovery nodes"
                  value={fmtInt(countyRecovery.length)}
                />
                <StatRow
                  label="Enablers (support orgs)"
                  value={fmtInt(countyEnablers.length)}
                />
                {countyProcessors.length === 0 && countyFarms.length > 0 ? (
                  <div className="mt-4 pt-4 border-t border-cream-shadow text-xs text-terracotta leading-relaxed">
                    <b>Processing gap:</b> {countyFarms.length} farms producing
                    locally, zero processors in-county.
                  </div>
                ) : null}
                {countyRecovery.length === 0 &&
                typeof countyAttrs.food_insecurity_rate === "number" &&
                (countyAttrs.food_insecurity_rate as number) > 0.12 ? (
                  <div className="mt-3 text-xs text-terracotta leading-relaxed">
                    <b>Food-access gap:</b>{" "}
                    {fmtPct(countyAttrs.food_insecurity_rate as number)} food
                    insecurity with no recovery infrastructure here.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="text-[11px] text-charcoal-soft/70 italic">
              Demographic values are illustrative-fictional — plausible ranges,
              not real Census measurements. Everything else is real demo data.
            </div>
          </>
        ) : null}
      </section>

      <section className="rounded-[14px] border border-dashed border-cream-shadow bg-bone/40 p-6 text-sm text-charcoal-soft leading-relaxed">
        <b className="text-charcoal">More cards in progress.</b> This view
        will grow to include the food-access gap map (food-insecurity
        choropleth overlaid with supply), infrastructure investment
        opportunities, and the Community Wealth Score ranking.
      </section>
    </div>
  );
}

function StatRow({
  label,
  value,
  context,
}: {
  label: string;
  value: string;
  context?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 border-b border-cream-shadow last:border-b-0">
      <div className="text-sm text-charcoal-soft">{label}</div>
      <div className="text-right">
        <div className="text-sm text-charcoal font-semibold tabular-nums">
          {value}
        </div>
        {context ? (
          <div className="text-[11px] text-charcoal-soft/80">{context}</div>
        ) : null}
      </div>
    </div>
  );
}
