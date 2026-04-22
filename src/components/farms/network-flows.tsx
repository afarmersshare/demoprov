"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  sankey,
  sankeyLinkHorizontal,
  sankeyJustify,
  type SankeyGraph,
  type SankeyNode,
  type SankeyLink,
} from "d3-sankey";
import type {
  Farm,
  Market,
  Distributor,
  Relationship,
} from "./network-explorer";

const KIND_COLOR = {
  farm: "#2f4a3a",
  market: "#c77f2a",
  distributor: "#7a8aa0",
  afs: "#1f2421",
} as const;

const CHARCOAL = "#1f2421";
const CHARCOAL_SOFT = "#4a524e";

type Props = {
  farms: Farm[];
  markets: Market[];
  distributors: Distributor[];
  relationships: Relationship[];
};

type NodeDatum = {
  key: string;
  name: string;
  color: string;
  column: 0 | 1 | 2;
};

type LinkDatum = {
  source: number;
  target: number;
  value: number;
};

type LaidNode = SankeyNode<NodeDatum, LinkDatum>;
type LaidLink = SankeyLink<NodeDatum, LinkDatum>;

function prettify(s: string | null | undefined): string {
  if (!s) return "Other";
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function relVolume(r: Relationship): number {
  const attrs = r.attributes as {
    volume_lbs?: number;
    annual_volume_lbs?: number;
    volume?: number;
  } | null;
  const v =
    attrs?.volume_lbs ?? attrs?.annual_volume_lbs ?? attrs?.volume ?? null;
  return typeof v === "number" && v > 0 ? v : 1000;
}

function formatLbs(v: number): string {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M lbs/yr";
  if (v >= 1_000) return (v / 1_000).toFixed(0) + "k lbs/yr";
  return Math.round(v).toLocaleString() + " lbs/yr";
}

export function NetworkFlows({
  farms,
  markets,
  distributors,
  relationships,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(960);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const sync = () => setWidth(el.clientWidth || 960);
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const layout = useMemo(() => {
    type Resolved = {
      kind: "farm" | "market" | "distributor";
      farm_type?: string | null;
      market_type?: string | null;
    };
    const byUpid = new Map<string, Resolved>();
    for (const f of farms)
      byUpid.set(f.upid, { kind: "farm", farm_type: f.farm_type });
    for (const m of markets)
      byUpid.set(m.upid, { kind: "market", market_type: m.market_type });
    for (const d of distributors) byUpid.set(d.upid, { kind: "distributor" });

    const rank = { farm: 0, distributor: 1, market: 2 } as const;
    const keyFor = (upid: string): string | null => {
      const x = byUpid.get(upid);
      if (!x) return null;
      if (x.kind === "farm") return "F:" + (x.farm_type ?? "other");
      if (x.kind === "market") return "M:" + (x.market_type ?? "other");
      return "MID:DST";
    };

    const flows = new Map<string, number>();
    const addFlow = (src: string, dst: string, v: number) => {
      if (src === dst) return;
      const k = src + "||" + dst;
      flows.set(k, (flows.get(k) ?? 0) + v);
    };

    for (const r of relationships) {
      const a = byUpid.get(r.node_a_upid);
      const b = byUpid.get(r.node_b_upid);
      if (!a || !b) continue;
      let src = r.node_a_upid;
      let dst = r.node_b_upid;
      if (rank[a.kind] > rank[b.kind]) {
        src = r.node_b_upid;
        dst = r.node_a_upid;
      }
      const sk = keyFor(src);
      const dk = keyFor(dst);
      if (!sk || !dk) continue;
      addFlow(sk, dk, relVolume(r));
    }

    const enrolledFarms = farms.filter((f) => f.afs_member_status === "enrolled");
    const afsMarkets = markets.filter(
      (m) =>
        m.afs_member_status === "enrolled" ||
        m.afs_member_status === "engaged",
    );
    if (enrolledFarms.length > 0 && afsMarkets.length > 0) {
      let totalIn = 0;
      for (const f of enrolledFarms) {
        const v = Math.max(1000, (f.acres_total ?? 50) * 50);
        addFlow("F:" + (f.farm_type ?? "other"), "MID:AFS", v);
        totalIn += v;
      }
      const weights = afsMarkets.map((m) => {
        const attrs = m.attributes as {
          annual_purchase_volume?: number;
          annual_purchase_usd?: number;
        } | null;
        const raw =
          attrs?.annual_purchase_volume ?? attrs?.annual_purchase_usd ?? null;
        return {
          m,
          w: typeof raw === "number" && raw > 0 ? raw : 1_000_000,
        };
      });
      const totalW = weights.reduce((s, x) => s + x.w, 0) || 1;
      for (const { m, w } of weights) {
        const v = (totalIn * w) / totalW;
        addFlow("MID:AFS", "M:" + (m.market_type ?? "other"), v);
      }
    }

    const keys = new Set<string>();
    flows.forEach((_, k) => {
      const [s, d] = k.split("||");
      keys.add(s);
      keys.add(d);
    });

    if (keys.size === 0) return null;

    const meta: Record<string, { name: string; color: string; column: 0 | 1 | 2 }> = {
      "MID:AFS": {
        name: "A Farmer's Share",
        color: KIND_COLOR.afs,
        column: 1,
      },
      "MID:DST": {
        name: "Distributors",
        color: KIND_COLOR.distributor,
        column: 1,
      },
    };

    const nodes: NodeDatum[] = [];
    const idx: Record<string, number> = {};
    Array.from(keys).forEach((k) => {
      let name: string, color: string, column: 0 | 1 | 2;
      if (k.startsWith("F:")) {
        name = prettify(k.slice(2));
        color = KIND_COLOR.farm;
        column = 0;
      } else if (k.startsWith("M:")) {
        name = prettify(k.slice(2));
        color = KIND_COLOR.market;
        column = 2;
      } else {
        name = meta[k].name;
        color = meta[k].color;
        column = meta[k].column;
      }
      idx[k] = nodes.length;
      nodes.push({ key: k, name, color, column });
    });

    const links: LinkDatum[] = Array.from(flows.entries()).map(([k, v]) => {
      const [s, d] = k.split("||");
      return { source: idx[s], target: idx[d], value: Math.max(1, v) };
    });

    if (links.length === 0) return null;

    const height = 560;
    const margin = { top: 36, right: 180, bottom: 16, left: 20 };
    const effWidth = Math.max(width, 520);

    const layoutFn = sankey<NodeDatum, LinkDatum>()
      .nodeWidth(18)
      .nodePadding(14)
      .nodeAlign(sankeyJustify)
      .extent([
        [margin.left, margin.top],
        [effWidth - margin.right, height - margin.bottom],
      ]);

    const graph: SankeyGraph<NodeDatum, LinkDatum> = layoutFn({
      nodes: nodes.map((n) => ({ ...n })),
      links: links.map((l) => ({ ...l })),
    });

    const pathGen = sankeyLinkHorizontal<NodeDatum, LinkDatum>();

    return {
      nodes: graph.nodes,
      links: graph.links,
      pathGen,
      width: effWidth,
      height,
      margin,
    };
  }, [farms, markets, distributors, relationships, width]);

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-[14px] overflow-hidden border border-cream-shadow bg-white"
    >
      {layout === null ? (
        <div className="flex items-center justify-center h-[560px] text-sm text-charcoal-soft px-6 text-center">
          No flows match these filters — broaden the member-status filter above.
        </div>
      ) : (
        <svg
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          preserveAspectRatio="xMidYMid meet"
          className="block w-full"
          style={{ height: layout.height }}
        >
          <text
            x={layout.margin.left}
            y={20}
            fontSize={11}
            fontWeight={700}
            fill={CHARCOAL_SOFT}
            style={{ letterSpacing: "0.1em", textTransform: "uppercase" }}
          >
            Farms · by type
          </text>
          <text
            x={layout.width / 2}
            y={20}
            fontSize={11}
            fontWeight={700}
            fill={CHARCOAL_SOFT}
            textAnchor="middle"
            style={{ letterSpacing: "0.1em", textTransform: "uppercase" }}
          >
            Intermediaries
          </text>
          <text
            x={layout.width - layout.margin.right}
            y={20}
            fontSize={11}
            fontWeight={700}
            fill={CHARCOAL_SOFT}
            textAnchor="end"
            style={{ letterSpacing: "0.1em", textTransform: "uppercase" }}
          >
            Buyers · by type
          </text>

          <g fill="none" style={{ mixBlendMode: "multiply" }}>
            {layout.links.map((link, i) => {
              const l = link as LaidLink;
              const sourceNode = l.source as LaidNode;
              const targetNode = l.target as LaidNode;
              const id =
                (sourceNode.index ?? 0) + "-" + (targetNode.index ?? 0) + "-" + i;
              const active = hoveredLink === id;
              const anyHover = hoveredLink !== null || hoveredNode !== null;
              const nodeHoverMatches =
                hoveredNode !== null &&
                (sourceNode.key === hoveredNode ||
                  targetNode.key === hoveredNode);
              const opacity = active
                ? 0.6
                : nodeHoverMatches
                  ? 0.5
                  : anyHover
                    ? 0.08
                    : 0.28;
              const d = layout.pathGen(l) ?? "";
              return (
                <path
                  key={id}
                  d={d}
                  stroke={sourceNode.color}
                  strokeOpacity={opacity}
                  strokeWidth={Math.max(1, l.width ?? 1)}
                  style={{ cursor: "pointer", transition: "stroke-opacity 0.15s" }}
                  onMouseEnter={() => setHoveredLink(id)}
                  onMouseLeave={() => setHoveredLink(null)}
                >
                  <title>{`${sourceNode.name} → ${targetNode.name}\n${formatLbs(l.value ?? 0)}`}</title>
                </path>
              );
            })}
          </g>

          <g>
            {layout.nodes.map((n) => {
              const nd = n as LaidNode;
              const x0 = nd.x0 ?? 0;
              const x1 = nd.x1 ?? 0;
              const y0 = nd.y0 ?? 0;
              const y1 = nd.y1 ?? 0;
              const h = Math.max(1, y1 - y0);
              const labelLeft = x0 < layout.width / 2;
              const active = hoveredNode === nd.key;
              return (
                <g
                  key={nd.key}
                  onMouseEnter={() => setHoveredNode(nd.key)}
                  onMouseLeave={() => setHoveredNode(null)}
                  style={{ cursor: "pointer" }}
                >
                  <rect
                    x={x0}
                    y={y0}
                    width={x1 - x0}
                    height={h}
                    fill={nd.color}
                    rx={2}
                    opacity={active ? 1 : 0.92}
                  />
                  <text
                    x={labelLeft ? x1 + 6 : x0 - 6}
                    y={(y0 + y1) / 2}
                    dy="0.35em"
                    textAnchor={labelLeft ? "start" : "end"}
                    fill={CHARCOAL}
                    fontSize={12}
                    fontWeight={active ? 700 : 500}
                  >
                    {nd.name}
                  </text>
                  <text
                    x={labelLeft ? x1 + 6 : x0 - 6}
                    y={(y0 + y1) / 2 + 14}
                    dy="0.35em"
                    textAnchor={labelLeft ? "start" : "end"}
                    fill={CHARCOAL_SOFT}
                    fontSize={10}
                  >
                    {formatLbs(nd.value ?? 0)}
                  </text>
                  <title>{`${nd.name}\n${formatLbs(nd.value ?? 0)}`}</title>
                </g>
              );
            })}
          </g>
        </svg>
      )}

      <div className="border-t border-cream-shadow bg-cream-deep/40 px-4 py-2.5 text-[11px] text-charcoal-soft leading-snug">
        Ribbon thickness is product volume. Real farm↔market and farm↔distributor
        connections come from the seed; the A Farmer&apos;s Share brokerage flows
        are illustrative — proportional to enrolled-farm acreage and engaged
        buyer demand. Hover any ribbon or block to trace the flow.
      </div>
    </div>
  );
}
