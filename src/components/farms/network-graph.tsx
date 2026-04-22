"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  Farm,
  Market,
  Distributor,
  Relationship,
  NetworkEntity,
} from "./network-explorer";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
}) as unknown as React.ComponentType<Record<string, unknown>>;

const KIND_COLOR = {
  farm: "#2f4a3a",
  market: "#c77f2a",
  distributor: "#7a8aa0",
  afs: "#1f2421",
} as const;

const CREAM = "#f7f3eb";
const CREAM_SHADOW = "#e3dcc7";
const CHARCOAL = "#1f2421";

const AFS_ID = "__afs__";

type GraphNode = {
  id: string;
  kind: "farm" | "market" | "distributor" | "afs";
  name: string;
  weight: number;
  entity: NetworkEntity | null;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
};

type GraphLink = {
  source: string | GraphNode;
  target: string | GraphNode;
  type: string;
};

type Props = {
  farms: Farm[];
  markets: Market[];
  distributors: Distributor[];
  relationships: Relationship[];
  selected: NetworkEntity | null;
  onSelect: (entity: NetworkEntity | null) => void;
};

function farmWeight(f: Farm): number {
  const acres = f.acres_total ?? 0;
  return Math.min(1, acres / 800);
}

function marketWeight(m: Market): number {
  const attrs = m.attributes as {
    annual_purchase_volume?: number;
    annual_purchase_usd?: number;
  } | null;
  const raw = attrs?.annual_purchase_volume ?? attrs?.annual_purchase_usd;
  if (typeof raw === "number" && raw > 0) {
    return Math.min(1, raw / 5_000_000);
  }
  return 0.5;
}

function distributorWeight(d: Distributor): number {
  const attrs = d.attributes as { fleet_size?: number } | null;
  const raw = attrs?.fleet_size;
  if (typeof raw === "number" && raw > 0) return Math.min(1, raw / 45);
  return 0.5;
}

function resolveEndpointId(end: unknown): string {
  if (typeof end === "string") return end;
  if (end && typeof end === "object" && "id" in (end as { id?: unknown })) {
    return String((end as { id: unknown }).id);
  }
  return "";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function kindLabel(kind: GraphNode["kind"]): string {
  switch (kind) {
    case "afs":
      return "A Farmer's Share";
    case "farm":
      return "Farm";
    case "market":
      return "Market / buyer";
    case "distributor":
      return "Distributor";
  }
}

export function NetworkGraph({
  farms,
  markets,
  distributors,
  relationships,
  selected,
  onSelect,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dims, setDims] = useState({ width: 800, height: 600 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const sync = () => {
      setDims({ width: el.clientWidth, height: el.clientHeight });
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { nodes, links, neighborMap } = useMemo(() => {
    const nodesList: GraphNode[] = [];
    const byUpid = new Map<string, NetworkEntity>();

    for (const f of farms) {
      const entity: NetworkEntity = { kind: "farm", data: f };
      byUpid.set(f.upid, entity);
      nodesList.push({
        id: f.upid,
        kind: "farm",
        name: f.name,
        weight: farmWeight(f),
        entity,
      });
    }
    for (const m of markets) {
      const entity: NetworkEntity = { kind: "market", data: m };
      byUpid.set(m.upid, entity);
      nodesList.push({
        id: m.upid,
        kind: "market",
        name: m.name,
        weight: marketWeight(m),
        entity,
      });
    }
    for (const d of distributors) {
      const entity: NetworkEntity = { kind: "distributor", data: d };
      byUpid.set(d.upid, entity);
      nodesList.push({
        id: d.upid,
        kind: "distributor",
        name: d.name,
        weight: distributorWeight(d),
        entity,
      });
    }
    nodesList.push({
      id: AFS_ID,
      kind: "afs",
      name: "A Farmer's Share",
      weight: 1,
      entity: null,
      fx: 0,
      fy: 0,
    });

    const linksList: GraphLink[] = [];
    let orphans = 0;
    for (const r of relationships) {
      if (!byUpid.has(r.node_a_upid) || !byUpid.has(r.node_b_upid)) {
        orphans += 1;
        continue;
      }
      linksList.push({
        source: r.node_a_upid,
        target: r.node_b_upid,
        type: r.relationship_type,
      });
    }
    if (orphans > 0 && typeof window !== "undefined") {
      // eslint-disable-next-line no-console
      console.info(
        `[NetworkGraph] skipped ${orphans} relationship(s) whose endpoints are not in the seeded farm/market/distributor tables.`,
      );
    }

    for (const f of farms) {
      if (f.afs_member_status === "enrolled") {
        linksList.push({
          source: AFS_ID,
          target: f.upid,
          type: "afs_enrollment",
        });
      }
    }

    const nm = new Map<string, Set<string>>();
    for (const l of linksList) {
      const s = resolveEndpointId(l.source);
      const t = resolveEndpointId(l.target);
      if (!nm.has(s)) nm.set(s, new Set());
      if (!nm.has(t)) nm.set(t, new Set());
      nm.get(s)!.add(t);
      nm.get(t)!.add(s);
    }

    return { nodes: nodesList, links: linksList, neighborMap: nm };
  }, [farms, markets, distributors, relationships]);

  const graphData = useMemo(
    () => ({
      nodes: nodes.map((n) => ({ ...n })),
      links: links.map((l) => ({ ...l })),
    }),
    [nodes, links],
  );

  const selectedId =
    selected && selected.kind !== ("afs" as string) ? selected.data.upid : null;
  const activeId = hoveredId ?? selectedId;

  const isNeighborOfActive = (id: string): boolean => {
    if (!activeId) return true;
    if (id === activeId) return true;
    const neighbors = neighborMap.get(activeId);
    return neighbors ? neighbors.has(id) : false;
  };

  const nothingToPlot = farms.length + markets.length + distributors.length === 0;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[600px] rounded-[14px] overflow-hidden border border-cream-shadow bg-cream"
    >
      {!nothingToPlot ? (
        <ForceGraph2D
          graphData={graphData}
          width={dims.width}
          height={dims.height}
          backgroundColor={CREAM}
          nodeRelSize={4}
          nodeVal={(n: GraphNode) =>
            n.kind === "afs" ? 36 : 9 + n.weight * 5
          }
          nodeColor={(n: GraphNode) => {
            const base = KIND_COLOR[n.kind];
            if (!activeId) return base;
            return isNeighborOfActive(n.id) ? base : "rgba(31,36,33,0.12)";
          }}
          nodeLabel={(n: GraphNode) => {
            const sub =
              n.kind === "afs"
                ? "Aggregator"
                : kindLabel(n.kind);
            return `<div style="background:white;padding:6px 10px;border-radius:6px;border:1px solid ${CREAM_SHADOW};font-size:12px;color:${CHARCOAL};box-shadow:0 2px 6px rgba(0,0,0,0.08);"><b>${escapeHtml(n.name)}</b><br/><span style="color:#4a524e;font-size:11px;">${escapeHtml(sub)}</span></div>`;
          }}
          linkColor={(l: GraphLink) => {
            if (!activeId) return "rgba(31,36,33,0.12)";
            const s = resolveEndpointId(l.source);
            const t = resolveEndpointId(l.target);
            if (s === activeId || t === activeId)
              return "rgba(31,36,33,0.45)";
            return "rgba(31,36,33,0.04)";
          }}
          linkWidth={(l: GraphLink) => {
            if (!activeId) return 0.6;
            const s = resolveEndpointId(l.source);
            const t = resolveEndpointId(l.target);
            return s === activeId || t === activeId ? 2 : 0.6;
          }}
          linkDirectionalParticles={(l: GraphLink) => {
            if (!activeId) return 0;
            const s = resolveEndpointId(l.source);
            const t = resolveEndpointId(l.target);
            return s === activeId || t === activeId ? 2 : 0;
          }}
          linkDirectionalParticleWidth={2}
          linkDirectionalParticleColor={() => "#2f4a3a"}
          onNodeHover={(n: GraphNode | null) =>
            setHoveredId(n ? n.id : null)
          }
          onNodeClick={(n: GraphNode) => {
            if (n.kind === "afs" || !n.entity) {
              onSelect(null);
              return;
            }
            onSelect(n.entity);
          }}
          onBackgroundClick={() => onSelect(null)}
          nodeCanvasObjectMode={(n: GraphNode) => {
            if (n.kind === "afs") return "before";
            if (
              selected &&
              n.entity &&
              selected.kind === n.entity.kind &&
              selected.data.upid === n.entity.data.upid
            ) {
              return "before";
            }
            return undefined;
          }}
          nodeCanvasObject={(n: GraphNode, ctx: CanvasRenderingContext2D) => {
            const x = n.x ?? 0;
            const y = n.y ?? 0;
            if (n.kind === "afs") {
              const r = Math.sqrt(36) * 4 + 5;
              ctx.beginPath();
              ctx.arc(x, y, r, 0, Math.PI * 2);
              ctx.fillStyle = CREAM;
              ctx.fill();
              ctx.beginPath();
              ctx.arc(x, y, r, 0, Math.PI * 2);
              ctx.strokeStyle = CREAM_SHADOW;
              ctx.lineWidth = 1;
              ctx.stroke();
              return;
            }
            if (
              selected &&
              n.entity &&
              selected.kind === n.entity.kind &&
              selected.data.upid === n.entity.data.upid
            ) {
              const baseRadius = Math.sqrt(9 + n.weight * 5) * 4;
              const r = baseRadius + 4;
              ctx.beginPath();
              ctx.arc(x, y, r, 0, Math.PI * 2);
              ctx.strokeStyle = CHARCOAL;
              ctx.lineWidth = 2;
              ctx.stroke();
            }
          }}
          d3AlphaDecay={0.015}
          d3VelocityDecay={0.35}
          cooldownTicks={120}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white/95 backdrop-blur-sm rounded-[10px] border border-cream-shadow px-4 py-3 text-sm text-charcoal-soft">
            Nothing matches these filters — adjust above.
          </div>
        </div>
      )}

      <div className="absolute bottom-4 left-4 bg-white/96 backdrop-blur-sm rounded-[10px] border border-cream-shadow px-4 py-3 text-xs text-charcoal-soft shadow-sm space-y-1.5">
        <div className="flex items-center gap-2.5">
          <span
            className="inline-block w-3 h-3 rounded-full"
            style={{ background: KIND_COLOR.afs, border: `2px solid ${CREAM}` }}
          />
          A Farmer&apos;s Share
        </div>
        <div className="flex items-center gap-2.5">
          <span
            className="inline-block w-3 h-3 rounded-full"
            style={{ background: KIND_COLOR.farm }}
          />
          Farms
        </div>
        <div className="flex items-center gap-2.5">
          <span
            className="inline-block w-3 h-3 rounded-full"
            style={{ background: KIND_COLOR.market }}
          />
          Markets / buyers
        </div>
        <div className="flex items-center gap-2.5">
          <span
            className="inline-block w-3 h-3 rounded-full"
            style={{ background: KIND_COLOR.distributor }}
          />
          Distributors
        </div>
      </div>

      <div className="absolute top-4 right-4 bg-white/92 backdrop-blur-sm rounded-[10px] border border-cream-shadow px-3 py-2 text-[11px] text-charcoal-soft shadow-sm max-w-[220px] leading-snug">
        Hover a node to trace its connections. Click to open details.
      </div>
    </div>
  );
}
