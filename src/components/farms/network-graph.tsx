"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  Farm,
  Market,
  Distributor,
  Processor,
  RecoveryNode,
  Enabler,
  Relationship,
  Person,
  NetworkEntity,
} from "./network-explorer";
import {
  MOSS,
  MARKET,
  CREAM,
  CREAM_SHADOW,
  CHARCOAL,
  SAGE,
} from "@/lib/palette";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
}) as unknown as React.ComponentType<Record<string, unknown>>;

const KIND_COLOR = {
  farm: MOSS,
  market: MARKET,
  distributor: "#7a8aa0",
  processor: "#a14a2a",
  recovery_node: "#6b9370",
  enabler: "#bfa98a",
  afs: SAGE,
  person: "#8a8072",
} as const;

const AFS_ID = "__afs__";

type GraphNode = {
  id: string;
  kind:
    | "farm"
    | "market"
    | "distributor"
    | "processor"
    | "recovery_node"
    | "enabler"
    | "afs"
    | "person";
  name: string;
  weight: number;
  entity: NetworkEntity | null;
  personTitle?: string;
  affiliatedOrgName?: string;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
};

type GraphLink = {
  source: string | GraphNode;
  target: string | GraphNode;
  type: string;
  isPersonEdge?: boolean;
};

type Props = {
  farms: Farm[];
  markets: Market[];
  distributors: Distributor[];
  processors: Processor[];
  recoveryNodes: RecoveryNode[];
  enablers: Enabler[];
  relationships: Relationship[];
  persons: Person[];
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

function processorWeight(p: Processor): number {
  const attrs = p.attributes as {
    capacity_kg_per_day?: number;
    annual_capacity_lbs?: number;
    annual_capacity_gal?: number;
  } | null;
  const cap =
    attrs?.capacity_kg_per_day ??
    (typeof attrs?.annual_capacity_lbs === "number"
      ? attrs.annual_capacity_lbs / 365
      : undefined) ??
    (typeof attrs?.annual_capacity_gal === "number"
      ? attrs.annual_capacity_gal / 100
      : undefined);
  if (typeof cap === "number" && cap > 0) return Math.min(1, cap / 9000);
  return 0.5;
}

function recoveryWeight(r: RecoveryNode): number {
  const attrs = r.attributes as {
    capacity_pounds_per_week?: number;
  } | null;
  const cap = attrs?.capacity_pounds_per_week;
  if (typeof cap === "number" && cap > 0) return Math.min(1, cap / 200_000);
  return 0.5;
}

function enablerWeight(en: Enabler): number {
  const attrs = en.attributes as {
    staff_count?: number;
    annual_budget_usd?: number;
  } | null;
  const staff = attrs?.staff_count;
  if (typeof staff === "number" && staff > 0) return Math.min(1, staff / 60);
  const budget = attrs?.annual_budget_usd;
  if (typeof budget === "number" && budget > 0)
    return Math.min(1, budget / 5_000_000);
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
    case "processor":
      return "Processor";
    case "recovery_node":
      return "Recovery node";
    case "enabler":
      return "Enabler";
    case "person":
      return "Person";
  }
}

export function NetworkGraph({
  farms,
  markets,
  distributors,
  processors,
  recoveryNodes,
  enablers,
  relationships,
  persons,
  selected,
  onSelect,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dims, setDims] = useState({ width: 800, height: 600 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [showPeople, setShowPeople] = useState(false);

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
    for (const p of processors) {
      const entity: NetworkEntity = { kind: "processor", data: p };
      byUpid.set(p.upid, entity);
      nodesList.push({
        id: p.upid,
        kind: "processor",
        name: p.name,
        weight: processorWeight(p),
        entity,
      });
    }
    for (const r of recoveryNodes) {
      const entity: NetworkEntity = { kind: "recovery_node", data: r };
      byUpid.set(r.upid, entity);
      nodesList.push({
        id: r.upid,
        kind: "recovery_node",
        name: r.name,
        weight: recoveryWeight(r),
        entity,
      });
    }
    for (const en of enablers) {
      const entity: NetworkEntity = { kind: "enabler", data: en };
      byUpid.set(en.upid, entity);
      nodesList.push({
        id: en.upid,
        kind: "enabler",
        name: en.name,
        weight: enablerWeight(en),
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
        `[NetworkGraph] skipped ${orphans} relationship(s) whose endpoints are not in the seeded entity tables (farms, markets, distributors, processors, recovery_nodes, enablers).`,
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
    for (const p of processors) {
      if (p.afs_member_status === "enrolled") {
        linksList.push({
          source: AFS_ID,
          target: p.upid,
          type: "afs_enrollment",
        });
      }
    }
    for (const r of recoveryNodes) {
      const active = (r.attributes as { afs_active?: boolean } | null)
        ?.afs_active;
      if (active) {
        linksList.push({
          source: AFS_ID,
          target: r.upid,
          type: "afs_partnership",
        });
      }
    }
    for (const en of enablers) {
      const active = (en.attributes as { afs_active?: boolean } | null)
        ?.afs_active;
      if (active) {
        linksList.push({
          source: AFS_ID,
          target: en.upid,
          type: "afs_partnership",
        });
      }
    }

    if (showPeople) {
      const personByUpid = new Map<string, Person>();
      for (const px of persons) personByUpid.set(px.upid, px);

      const personAffiliations = new Map<string, string>();
      for (const r of relationships) {
        const kind = (r.attributes as { edge_kind?: string } | null)
          ?.edge_kind;
        if (kind !== "person_affiliation") continue;
        const person = personByUpid.get(r.node_a_upid);
        if (!person) continue;
        if (!byUpid.has(r.node_b_upid)) continue;
        personAffiliations.set(person.upid, r.node_b_upid);
      }

      for (const [personUpid, orgUpid] of personAffiliations) {
        const person = personByUpid.get(personUpid);
        const org = byUpid.get(orgUpid);
        if (!person || !org) continue;
        const title = (person.attributes as { title?: string } | null)?.title;
        nodesList.push({
          id: person.upid,
          kind: "person",
          name: person.full_name,
          weight: 0,
          entity: org,
          personTitle: title ?? undefined,
          affiliatedOrgName: org.data.name ?? undefined,
        });
        linksList.push({
          source: person.upid,
          target: orgUpid,
          type: "person_affiliation",
          isPersonEdge: true,
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
  }, [
    farms,
    markets,
    distributors,
    processors,
    recoveryNodes,
    enablers,
    relationships,
    persons,
    showPeople,
  ]);

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

  const nothingToPlot =
    farms.length +
      markets.length +
      distributors.length +
      processors.length +
      recoveryNodes.length +
      enablers.length ===
    0;

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
          nodeVal={(n: GraphNode) => {
            if (n.kind === "afs") return 36;
            if (n.kind === "person") return 2;
            return 9 + n.weight * 5;
          }}
          nodeColor={(n: GraphNode) => {
            const base = KIND_COLOR[n.kind];
            if (!activeId) return base;
            return isNeighborOfActive(n.id) ? base : "rgba(31,36,33,0.12)";
          }}
          nodeLabel={(n: GraphNode) => {
            if (n.kind === "person") {
              const title = n.personTitle
                ? escapeHtml(n.personTitle)
                : "Person";
              const org = n.affiliatedOrgName
                ? ` at <b>${escapeHtml(n.affiliatedOrgName)}</b>`
                : "";
              return `<div style="background:white;padding:6px 10px;border-radius:6px;border:1px solid ${CREAM_SHADOW};font-size:12px;color:${CHARCOAL};box-shadow:0 2px 6px rgba(0,0,0,0.08);"><b>${escapeHtml(n.name)}</b><br/><span style="color:#4a524e;font-size:11px;">${title}${org}</span></div>`;
            }
            const sub =
              n.kind === "afs"
                ? "Aggregator"
                : kindLabel(n.kind);
            return `<div style="background:white;padding:6px 10px;border-radius:6px;border:1px solid ${CREAM_SHADOW};font-size:12px;color:${CHARCOAL};box-shadow:0 2px 6px rgba(0,0,0,0.08);"><b>${escapeHtml(n.name)}</b><br/><span style="color:#4a524e;font-size:11px;">${escapeHtml(sub)}</span></div>`;
          }}
          linkColor={(l: GraphLink) => {
            const s = resolveEndpointId(l.source);
            const t = resolveEndpointId(l.target);
            const highlighted =
              activeId && (s === activeId || t === activeId);
            if (highlighted) return "rgba(31,36,33,0.45)";
            if (l.isPersonEdge) return "rgba(138,128,114,0.35)";
            if (!activeId) return "rgba(31,36,33,0.12)";
            return "rgba(31,36,33,0.04)";
          }}
          linkWidth={(l: GraphLink) => {
            const s = resolveEndpointId(l.source);
            const t = resolveEndpointId(l.target);
            const highlighted =
              activeId && (s === activeId || t === activeId);
            if (highlighted) return 2;
            if (l.isPersonEdge) return 0.4;
            return 0.6;
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
            if (n.kind === "afs") return "replace";
            if (
              n.kind !== "person" &&
              selected &&
              n.id === selected.data.upid
            ) {
              return "before";
            }
            return undefined;
          }}
          nodeCanvasObject={(n: GraphNode, ctx: CanvasRenderingContext2D) => {
            const x = n.x ?? 0;
            const y = n.y ?? 0;
            if (n.kind === "afs") {
              const dim = !isNeighborOfActive(n.id);
              const ringAlpha = dim ? 0.35 : 1;
              const r = 26;
              ctx.beginPath();
              ctx.arc(x, y, r, 0, Math.PI * 2);
              ctx.fillStyle = CREAM;
              ctx.fill();
              ctx.beginPath();
              ctx.arc(x, y, r, 0, Math.PI * 2);
              ctx.strokeStyle = SAGE;
              ctx.globalAlpha = ringAlpha;
              ctx.lineWidth = 2.5;
              ctx.stroke();
              ctx.beginPath();
              ctx.arc(x, y, 3, 0, Math.PI * 2);
              ctx.fillStyle = SAGE;
              ctx.fill();
              ctx.globalAlpha = 1;
              return;
            }
            if (
              n.kind !== "person" &&
              selected &&
              n.id === selected.data.upid
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
            style={{ background: CREAM, border: `2px solid ${SAGE}` }}
          />
          A Farmer&apos;s Share
        </div>
        <LegendRow color={KIND_COLOR.farm} label="Farms" />
        <LegendRow color={KIND_COLOR.market} label="Markets / buyers" />
        <LegendRow color={KIND_COLOR.distributor} label="Distributors" />
        <LegendRow color={KIND_COLOR.processor} label="Processors" />
        <LegendRow color={KIND_COLOR.recovery_node} label="Recovery" />
        <LegendRow color={KIND_COLOR.enabler} label="Enablers" />
        {showPeople ? (
          <LegendRow color={KIND_COLOR.person} label="People" />
        ) : null}
      </div>

      <div className="absolute top-4 right-4 bg-white/92 backdrop-blur-sm rounded-[10px] border border-cream-shadow px-3 py-2 text-[11px] text-charcoal-soft shadow-sm max-w-[240px] leading-snug space-y-2">
        <div>Hover a node to trace its connections. Click to open details.</div>
        <label className="flex items-center gap-2 cursor-pointer select-none pt-1 border-t border-cream-shadow">
          <input
            type="checkbox"
            checked={showPeople}
            onChange={(e) => setShowPeople(e.target.checked)}
            className="accent-moss h-3 w-3 cursor-pointer"
          />
          <span className="text-charcoal">
            Show people{" "}
            <span className="text-charcoal-soft">({persons.length})</span>
          </span>
        </label>
        {showPeople ? (
          <div className="text-charcoal-soft/90 leading-snug">
            Clicking a person opens their affiliated organization — a preview
            of the CRM layer.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LegendRow({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="inline-block w-3 h-3 rounded-full"
        style={{ background: color }}
      />
      {label}
    </div>
  );
}
