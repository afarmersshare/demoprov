"use client";

import { useMemo, useState } from "react";
import type {
  Farm,
  Market,
  Distributor,
  Processor,
  RecoveryNode,
  Enabler,
  Region,
  NetworkEntity,
} from "./network-explorer";

type Kind =
  | "farm"
  | "market"
  | "distributor"
  | "processor"
  | "recovery_node"
  | "enabler";

type CountyBucket = {
  name: string;
  farms: Farm[];
  markets: Market[];
  distributors: Distributor[];
  processors: Processor[];
  recovery_nodes: RecoveryNode[];
  enablers: Enabler[];
};

const KIND_ORDER: Kind[] = [
  "farm",
  "market",
  "distributor",
  "processor",
  "recovery_node",
  "enabler",
];

const KIND_LABEL: Record<Kind, string> = {
  farm: "Farm",
  market: "Market",
  distributor: "Distributor",
  processor: "Processor",
  recovery_node: "Recovery",
  enabler: "Enabler",
};

const KIND_LABEL_PLURAL: Record<Kind, string> = {
  farm: "farms",
  market: "markets",
  distributor: "distributors",
  processor: "processors",
  recovery_node: "recovery nodes",
  enabler: "enablers",
};

const KIND_COLOR_BG: Record<Kind, string> = {
  farm: "bg-slate-blue",
  market: "bg-accent-amber",
  distributor: "bg-warm-charcoal",
  processor: "bg-forest-sage",
  recovery_node: "bg-slate-blue-light",
  enabler: "bg-mid-gray",
};

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
  point: [number, number] | undefined,
  counties: Region[],
): string {
  if (!point || counties.length === 0) return "Unknown county";
  let bestName = "Unknown county";
  let bestDist = Infinity;
  for (const c of counties) {
    const pt = c.geom_point?.coordinates;
    if (!pt) continue;
    const d = haversineMiles(point, pt);
    if (d < bestDist) {
      bestDist = d;
      bestName = c.name;
    }
  }
  return bestName;
}

type Props = {
  farms: Farm[];
  markets: Market[];
  distributors: Distributor[];
  processors: Processor[];
  recoveryNodes: RecoveryNode[];
  enablers: Enabler[];
  regions: Region[];
  statusFilter: "all" | "enrolled" | "engaged" | "prospect";
  onSelect: (e: NetworkEntity) => void;
};

export function NetworkByCounty({
  farms,
  markets,
  distributors,
  processors,
  recoveryNodes,
  enablers,
  regions,
  statusFilter,
  onSelect,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const buckets = useMemo(() => {
    const counties = regions.filter((r) => r.region_type === "county");
    const byCounty = new Map<string, CountyBucket>();
    const get = (name: string): CountyBucket => {
      let b = byCounty.get(name);
      if (!b) {
        b = {
          name,
          farms: [],
          markets: [],
          distributors: [],
          processors: [],
          recovery_nodes: [],
          enablers: [],
        };
        byCounty.set(name, b);
      }
      return b;
    };
    for (const f of farms) {
      const name =
        (f.attributes as { county_name?: string } | null)?.county_name ??
        (f.geom_point
          ? nearestCountyName(f.geom_point.coordinates, counties)
          : "Unknown county");
      get(name).farms.push(f);
    }
    for (const m of markets) {
      get(nearestCountyName(m.geom_point?.coordinates, counties)).markets.push(
        m,
      );
    }
    for (const d of distributors) {
      get(
        nearestCountyName(d.geom_point?.coordinates, counties),
      ).distributors.push(d);
    }
    for (const p of processors) {
      get(
        nearestCountyName(p.geom_point?.coordinates, counties),
      ).processors.push(p);
    }
    for (const r of recoveryNodes) {
      get(
        nearestCountyName(r.geom_point?.coordinates, counties),
      ).recovery_nodes.push(r);
    }
    for (const en of enablers) {
      get(
        nearestCountyName(en.geom_point?.coordinates, counties),
      ).enablers.push(en);
    }
    return Array.from(byCounty.values()).sort(
      (a, b) => totalOf(b) - totalOf(a),
    );
  }, [farms, markets, distributors, processors, recoveryNodes, enablers, regions]);

  const anyRows = buckets.some((b) => totalOf(b) > 0);
  const maxCount = Math.max(1, ...buckets.map(totalOf));

  if (!anyRows) {
    return (
      <div className="rounded-[14px] border border-cream-shadow bg-white p-6">
        <div className="text-sm text-charcoal-soft">
          No entities match these filters — adjust above.
        </div>
      </div>
    );
  }

  const toggle = (name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <div className="rounded-[14px] border border-cream-shadow bg-white p-6">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-4 text-[11px] text-charcoal-soft">
        {KIND_ORDER.map((k) => (
          <LegendSwatch
            key={k}
            colorClass={KIND_COLOR_BG[k]}
            label={KIND_LABEL[k]}
          />
        ))}
      </div>

      {statusFilter !== "all" ? (
        <div className="mb-4 text-[11px] text-charcoal-soft/80 italic">
          Recovery and enabler nodes don&apos;t use the enrolled / engaged /
          prospect taxonomy — they&apos;re hidden while Member status is set.
          Switch it to All to see them.
        </div>
      ) : null}

      <div className="space-y-3">
        {buckets.map((row) => {
          const total = totalOf(row);
          const isOpen = expanded.has(row.name);
          const breakdownParts = KIND_ORDER.map((k) => ({
            k,
            count: listFor(row, k).length,
          })).filter((x) => x.count > 0);
          return (
            <div key={row.name}>
              <button
                type="button"
                onClick={() => toggle(row.name)}
                className="w-full text-left group"
              >
                <div className="flex items-baseline justify-between mb-1.5 gap-4">
                  <div className="text-sm font-medium text-charcoal group-hover:text-slate-blue transition-colors">
                    {isOpen ? "▾ " : "▸ "}
                    {row.name}
                  </div>
                  <div className="text-xs text-charcoal-soft tabular-nums font-mono whitespace-nowrap">
                    {total} {total === 1 ? "entity" : "entities"}
                  </div>
                </div>
                <div className="flex h-2.5 w-full bg-cream-deep rounded-full overflow-hidden">
                  {KIND_ORDER.map((k) => {
                    const count = listFor(row, k).length;
                    if (count === 0) return null;
                    return (
                      <div
                        key={k}
                        className={`${KIND_COLOR_BG[k]} h-full`}
                        style={{ width: `${(count / maxCount) * 100}%` }}
                      />
                    );
                  })}
                </div>
                <div className="mt-1 text-[11px] text-charcoal-soft tabular-nums">
                  {breakdownParts.map((x, i) => (
                    <span key={x.k}>
                      {i > 0 ? " · " : ""}
                      {x.count} {KIND_LABEL_PLURAL[x.k]}
                    </span>
                  ))}
                </div>
              </button>

              {isOpen ? (
                <div className="mt-3 ml-4 pl-4 border-l-2 border-cream-shadow space-y-3 pb-3">
                  {KIND_ORDER.map((k) => {
                    const list = listFor(row, k);
                    if (list.length === 0) return null;
                    return (
                      <div key={k}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span
                            className={`inline-block w-2 h-2 rounded-full ${KIND_COLOR_BG[k]}`}
                          />
                          <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft">
                            {KIND_LABEL[k]} ({list.length})
                          </span>
                        </div>
                        <ul className="space-y-0.5 ml-4">
                          {list.map((item) => (
                            <li key={item.upid}>
                              <button
                                type="button"
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  onSelect(toEntity(k, item));
                                }}
                                className="text-sm text-charcoal hover:text-slate-blue hover:underline text-left"
                              >
                                {item.name}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function totalOf(b: CountyBucket): number {
  return (
    b.farms.length +
    b.markets.length +
    b.distributors.length +
    b.processors.length +
    b.recovery_nodes.length +
    b.enablers.length
  );
}

function listFor(
  b: CountyBucket,
  k: Kind,
):
  | Farm[]
  | Market[]
  | Distributor[]
  | Processor[]
  | RecoveryNode[]
  | Enabler[] {
  switch (k) {
    case "farm":
      return b.farms;
    case "market":
      return b.markets;
    case "distributor":
      return b.distributors;
    case "processor":
      return b.processors;
    case "recovery_node":
      return b.recovery_nodes;
    case "enabler":
      return b.enablers;
  }
}

function toEntity(
  k: Kind,
  item: Farm | Market | Distributor | Processor | RecoveryNode | Enabler,
): NetworkEntity {
  switch (k) {
    case "farm":
      return { kind: "farm", data: item as Farm };
    case "market":
      return { kind: "market", data: item as Market };
    case "distributor":
      return { kind: "distributor", data: item as Distributor };
    case "processor":
      return { kind: "processor", data: item as Processor };
    case "recovery_node":
      return { kind: "recovery_node", data: item as RecoveryNode };
    case "enabler":
      return { kind: "enabler", data: item as Enabler };
  }
}

function LegendSwatch({
  colorClass,
  label,
}: {
  colorClass: string;
  label: string;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className={"inline-block w-2.5 h-2.5 rounded-full " + colorClass}
      />
      {label}
    </span>
  );
}
