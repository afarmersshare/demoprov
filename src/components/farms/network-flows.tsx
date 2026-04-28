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
  Processor,
  RecoveryNode,
  Relationship,
} from "./network-explorer";

// Column palette.
// Recovery nodes split by diversion category — visually distinct so viewers
// see that "diversion" is three different outcomes, not one.
const KIND_COLOR = {
  farm: "#2f4a3a",
  processor: "#a14a2a",
  distributor: "#7a8aa0",
  afs: "#1f2421",
  market: "#c77f2a",
  recovery_plates: "#6b9370",
  recovery_soil: "#bfa98a",
  recovery_energy: "#b86b4b",
} as const;

const CHARCOAL = "#1f2421";
const CHARCOAL_SOFT = "#4a524e";

type Props = {
  farms: Farm[];
  markets: Market[];
  distributors: Distributor[];
  processors: Processor[];
  recoveryNodes: RecoveryNode[];
  relationships: Relationship[];
};

type NodeDatum = {
  key: string;
  name: string;
  color: string;
  group: "farm" | "processor" | "intermediary" | "market" | "recovery";
};

type LinkDatum = {
  source: number;
  target: number;
  value: number;
  synthetic: boolean;
};

type LaidNode = SankeyNode<NodeDatum, LinkDatum>;
type LaidLink = SankeyLink<NodeDatum, LinkDatum>;

function prettify(s: string | null | undefined): string {
  if (!s) return "Other";
  return s.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
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

// Map a farm_type to the processor type(s) that naturally handle it.
// Used to keep synthesized farm→processor flows plausible rather than
// flat-distributed. Unknown farm types fall back to co_packer.
function suggestedProcessorTypes(ft: string | null): string[] {
  switch (ft) {
    case "vegetable_mixed":
    case "vegetable_specialty":
    case "orchard":
    case "berry":
      return ["produce_packhouse", "central_kitchen"];
    case "livestock":
    case "poultry":
    case "mixed_crop_livestock":
    case "swine":
    case "beef":
      return ["meat_butchery"];
    case "dairy":
      return ["dairy_processing"];
    case "grain":
    case "row_crop":
      return ["grain_mill"];
    default:
      return ["co_packer"];
  }
}

function recoveryColorFor(cat: string): string {
  if (cat === "to_human_consumption") return KIND_COLOR.recovery_plates;
  if (cat === "to_soil_amendment") return KIND_COLOR.recovery_soil;
  if (cat === "to_energy_and_digestate") return KIND_COLOR.recovery_energy;
  return "#cfc4a9";
}

function recoveryCategoryLabel(cat: string): string {
  if (cat === "to_human_consumption") return "To plates (food rescue)";
  if (cat === "to_soil_amendment") return "To soil (compost)";
  if (cat === "to_energy_and_digestate") return "To energy (biogas)";
  return prettify(cat);
}

export function NetworkFlows({
  farms,
  markets,
  distributors,
  processors,
  recoveryNodes,
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
    // One resolved record per entity upid, so edges built from the
    // relationships table can be classified by both endpoints' kind.
    type Resolved =
      | { kind: "farm"; farm_type: string | null }
      | { kind: "processor"; processor_type: string | null }
      | { kind: "distributor" }
      | { kind: "market"; market_type: string | null }
      | { kind: "recovery"; diversion_category: string };

    const byUpid = new Map<string, Resolved>();
    for (const f of farms)
      byUpid.set(f.upid, { kind: "farm", farm_type: f.farm_type });
    for (const p of processors)
      byUpid.set(p.upid, {
        kind: "processor",
        processor_type: p.processor_type,
      });
    for (const d of distributors) byUpid.set(d.upid, { kind: "distributor" });
    for (const m of markets)
      byUpid.set(m.upid, { kind: "market", market_type: m.market_type });
    for (const r of recoveryNodes) {
      const cat =
        ((r.attributes ?? {}) as { diversion_category?: string })
          .diversion_category ?? "unknown";
      byUpid.set(r.upid, { kind: "recovery", diversion_category: cat });
    }

    // Flow direction always left→right by rank. Two nodes at the same
    // rank (market + recovery) can both be terminals — real edges between
    // them are rare but allowed.
    const rank: Record<Resolved["kind"], number> = {
      farm: 0,
      processor: 1,
      distributor: 2,
      market: 3,
      recovery: 3,
    };

    const keyFor = (upid: string): string | null => {
      const x = byUpid.get(upid);
      if (!x) return null;
      if (x.kind === "farm") return "F:" + (x.farm_type ?? "other");
      if (x.kind === "processor") return "P:" + (x.processor_type ?? "other");
      if (x.kind === "distributor") return "MID:DST";
      if (x.kind === "market") return "M:" + (x.market_type ?? "other");
      return "R:" + x.diversion_category;
    };

    // Flow map: src_key → dst_key, with accumulating value + sticky
    // synthetic flag. If any real edge contributes, the ribbon is rendered
    // solid (real signal wins over synthesized signal).
    type FlowMeta = { value: number; synthetic: boolean };
    const flows = new Map<string, FlowMeta>();
    const addFlow = (
      src: string,
      dst: string,
      v: number,
      synthetic: boolean,
    ) => {
      if (src === dst) return;
      if (v <= 0) return;
      const k = src + "||" + dst;
      const existing = flows.get(k);
      if (existing) {
        existing.value += v;
        if (!synthetic) existing.synthetic = false;
      } else {
        flows.set(k, { value: v, synthetic });
      }
    };

    // -------- 1. Real edges from the relationships table --------
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
      addFlow(sk, dk, relVolume(r), false);
    }

    // -------- 2. Synthesized AFS brokerage (from existing design) --------
    const enrolledFarms = farms.filter(
      (f) => f.afs_member_status === "enrolled",
    );
    const afsMarkets = markets.filter(
      (m) =>
        m.afs_member_status === "enrolled" ||
        m.afs_member_status === "engaged",
    );
    if (enrolledFarms.length > 0 && afsMarkets.length > 0) {
      let totalIn = 0;
      for (const f of enrolledFarms) {
        const v = Math.max(1000, (f.acres_total ?? 50) * 50);
        addFlow("F:" + (f.farm_type ?? "other"), "MID:AFS", v, true);
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
        addFlow("MID:AFS", "M:" + (m.market_type ?? "other"), v, true);
      }
    }

    // -------- 3. Synthesized farm → processor flows --------
    // Each enrolled/engaged farm sends a small estimated slice of output
    // through a processor type that matches its farm_type. Lets the middle
    // column actually have traffic — without faking dollars or tonnage.
    const processorTypePresence = new Set(
      processors.map((p) => p.processor_type).filter(Boolean) as string[],
    );
    for (const f of farms) {
      if (
        f.afs_member_status !== "enrolled" &&
        f.afs_member_status !== "engaged"
      ) {
        continue;
      }
      const suggested = suggestedProcessorTypes(f.farm_type).filter((t) =>
        processorTypePresence.has(t),
      );
      if (suggested.length === 0) continue;
      const base = Math.max(600, (f.acres_total ?? 30) * 18);
      const per = base / suggested.length;
      for (const pt of suggested) {
        addFlow("F:" + (f.farm_type ?? "other"), "P:" + pt, per, true);
      }
    }

    // -------- 4. Synthesized processor → distributor / AFS flows --------
    // Processors need an onward flow or the middle column is a dead end.
    // Route ~70% of processor inflow toward the distributors bucket and
    // ~30% toward AFS (rough stand-in for "sold to an aggregator").
    const processorInflow = new Map<string, number>();
    flows.forEach((meta, k) => {
      const [, dst] = k.split("||");
      if (dst.startsWith("P:")) {
        processorInflow.set(dst, (processorInflow.get(dst) ?? 0) + meta.value);
      }
    });
    processorInflow.forEach((totalIn, processorKey) => {
      addFlow(processorKey, "MID:DST", totalIn * 0.7, true);
      if (enrolledFarms.length > 0) {
        addFlow(processorKey, "MID:AFS", totalIn * 0.3, true);
      }
    });

    // -------- 5. Synthesized food rescue — market → recovery (plates) --------
    // Every market type kicks a small estimated slice into the food-rescue
    // channel. The number is small by design: we don't want to imply that
    // food rescue is a primary flow, just that it exists.
    const marketKeysSeen = new Set<string>();
    flows.forEach((_, k) => {
      const [s, d] = k.split("||");
      if (s.startsWith("M:")) marketKeysSeen.add(s);
      if (d.startsWith("M:")) marketKeysSeen.add(d);
    });
    const platesKey = "R:to_human_consumption";
    const hasPlatesCategory = recoveryNodes.some(
      (r) =>
        ((r.attributes ?? {}) as { diversion_category?: string })
          .diversion_category === "to_human_consumption",
    );
    if (hasPlatesCategory) {
      for (const mk of marketKeysSeen) {
        addFlow(mk, platesKey, 4500, true);
      }
    }

    // -------- Assemble nodes + links --------
    const keys = new Set<string>();
    flows.forEach((_, k) => {
      const [s, d] = k.split("||");
      keys.add(s);
      keys.add(d);
    });

    if (keys.size === 0) return null;

    const nameFor = (k: string): { name: string; color: string; group: NodeDatum["group"] } => {
      if (k === "MID:AFS")
        return {
          name: "A Farmer's Share",
          color: KIND_COLOR.afs,
          group: "intermediary",
        };
      if (k === "MID:DST")
        return {
          name: "Distributors",
          color: KIND_COLOR.distributor,
          group: "intermediary",
        };
      if (k.startsWith("F:"))
        return {
          name: prettify(k.slice(2)),
          color: KIND_COLOR.farm,
          group: "farm",
        };
      if (k.startsWith("P:"))
        return {
          name: prettify(k.slice(2)),
          color: KIND_COLOR.processor,
          group: "processor",
        };
      if (k.startsWith("M:"))
        return {
          name: prettify(k.slice(2)),
          color: KIND_COLOR.market,
          group: "market",
        };
      // Recovery
      const cat = k.slice(2);
      return {
        name: recoveryCategoryLabel(cat),
        color: recoveryColorFor(cat),
        group: "recovery",
      };
    };

    const nodes: NodeDatum[] = [];
    const idx: Record<string, number> = {};
    Array.from(keys).forEach((k) => {
      const m = nameFor(k);
      idx[k] = nodes.length;
      nodes.push({ key: k, name: m.name, color: m.color, group: m.group });
    });

    const links: LinkDatum[] = Array.from(flows.entries()).map(([k, meta]) => {
      const [s, d] = k.split("||");
      return {
        source: idx[s],
        target: idx[d],
        value: Math.max(1, meta.value),
        synthetic: meta.synthetic,
      };
    });

    if (links.length === 0) return null;

    const height = 620;
    // margin.right used to be 200 from when outcome labels were positioned
    // to the right of the rightmost nodes. Labels now render to the left
    // of right-half nodes (see labelLeft branch below), so the right margin
    // was just dead space pushing the diagram off-center on every viewport.
    // Tight 16px gutters all around let the sankey fill its container at
    // any width.
    const margin = { top: 12, right: 16, bottom: 16, left: 16 };
    // effWidth used to clamp at 520, which forced narrow phones to render a
    // 520-wide layout scaled down — squashing labels and ribbons. Now we
    // honor the actual container width with a 320 safety floor only for
    // the very narrowest viewports.
    const effWidth = Math.max(width, 320);

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

    // Label font sizes shrink on narrow viewports so long node names
    // ("Restaurant Independent", "Foodservice Management", etc.) don't
    // overflow into adjacent columns. Threshold matches Tailwind's sm.
    const isNarrow = effWidth < 640;
    const nameFont = isNarrow ? 9 : 12;
    const valueFont = isNarrow ? 7 : 10;
    const valueOffset = isNarrow ? 11 : 14;

    return {
      nodes: graph.nodes,
      links: graph.links,
      pathGen,
      width: effWidth,
      height,
      margin,
      nameFont,
      valueFont,
      valueOffset,
    };
  }, [farms, markets, distributors, processors, recoveryNodes, relationships, width]);

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-[14px] overflow-hidden border border-cream-shadow bg-white"
    >
      {layout === null ? (
        <div className="flex items-center justify-center h-[620px] text-sm text-charcoal-soft px-6 text-center">
          No flows match these filters — broaden the member-status filter above.
        </div>
      ) : (
        <>
          {/*
            Column headers in HTML so they wrap, respect user font scaling,
            and stay legible at every viewport width. Four equal columns
            with text-align matching the sankey nodes' visual position
            (left, center, center, right). On phones the long subtitles
            collapse to single words; full labels reappear at sm+.
          */}
          <div className="grid grid-cols-4 gap-1 px-3 pt-3 pb-1 text-[9px] sm:text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft">
            <div className="text-left">
              Farms<span className="hidden sm:inline"> · by type</span>
            </div>
            <div className="text-center">
              Processors<span className="hidden sm:inline"> · by type</span>
            </div>
            <div className="text-center">Aggregators</div>
            <div className="text-right">
              Outcomes<span className="hidden sm:inline"> · markets &amp; recovery</span>
            </div>
          </div>
          <svg
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            preserveAspectRatio="xMidYMid meet"
            className="block w-full h-auto"
          >
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
                ? 0.65
                : nodeHoverMatches
                  ? 0.5
                  : anyHover
                    ? 0.08
                    : 0.28;
              const d = layout.pathGen(l) ?? "";
              // Recovery ribbons take the recovery color so "what happens to
              // diverted food" reads from color alone, not just column position.
              const ribbonColor = targetNode.key.startsWith("R:")
                ? targetNode.color
                : sourceNode.color;
              // Synthetic ribbons render dashed. When zoomed out this reads
              // as a subtle texture — honest signal without being loud.
              const dashArray = l.synthetic ? "5 4" : undefined;
              return (
                <path
                  key={id}
                  d={d}
                  stroke={ribbonColor}
                  strokeOpacity={opacity}
                  strokeWidth={Math.max(1, l.width ?? 1)}
                  strokeDasharray={dashArray}
                  style={{
                    cursor: "pointer",
                    transition: "stroke-opacity 0.15s",
                  }}
                  onMouseEnter={() => setHoveredLink(id)}
                  onMouseLeave={() => setHoveredLink(null)}
                >
                  <title>{`${sourceNode.name} → ${targetNode.name}\n${formatLbs(l.value ?? 0)}\n${l.synthetic ? "Estimated flow" : "Observed edge"}`}</title>
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
                    fontSize={layout.nameFont}
                    fontWeight={active ? 700 : 500}
                  >
                    {nd.name}
                  </text>
                  <text
                    x={labelLeft ? x1 + 6 : x0 - 6}
                    y={(y0 + y1) / 2 + layout.valueOffset}
                    dy="0.35em"
                    textAnchor={labelLeft ? "start" : "end"}
                    fill={CHARCOAL_SOFT}
                    fontSize={layout.valueFont}
                  >
                    {formatLbs(nd.value ?? 0)}
                  </text>
                  <title>{`${nd.name}\n${formatLbs(nd.value ?? 0)}`}</title>
                </g>
              );
            })}
          </g>
        </svg>
        </>
      )}

      <div className="border-t border-cream-shadow bg-cream-deep/40 px-4 py-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-charcoal-soft leading-snug">
        <span className="inline-flex items-center gap-2">
          <svg width="28" height="6" className="shrink-0">
            <line x1="0" y1="3" x2="28" y2="3" stroke={CHARCOAL_SOFT} strokeWidth="2" />
          </svg>
          <span>
            <b className="text-charcoal">Solid ribbon</b> = observed edge in
            the network (farm↔market, farm↔recovery, distributor↔market).
          </span>
        </span>
        <span className="inline-flex items-center gap-2">
          <svg width="28" height="6" className="shrink-0">
            <line
              x1="0"
              y1="3"
              x2="28"
              y2="3"
              stroke={CHARCOAL_SOFT}
              strokeWidth="2"
              strokeDasharray="5 4"
            />
          </svg>
          <span>
            <b className="text-charcoal">Dashed ribbon</b> = estimated
            aggregate flow. Used for value-add processing, AFS brokerage, and
            food-rescue channels where per-edge data isn&rsquo;t yet captured.
          </span>
        </span>
        <span className="basis-full text-[10.5px] italic">
          Ribbon thickness is directional, not audited. Hover any ribbon or
          block to trace the flow.
        </span>
      </div>
    </div>
  );
}
