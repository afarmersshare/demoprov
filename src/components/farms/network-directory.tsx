"use client";

import { useMemo, useState } from "react";
import type {
  Farm,
  Market,
  Distributor,
  Processor,
  RecoveryNode,
  Enabler,
  NetworkEntity,
} from "./network-explorer";
import {
  EntityDetailPanel,
  prettify,
  statusPillClasses,
  statusLabel,
} from "./entity-detail-panel";

type EntityKind = NetworkEntity["kind"];

type Props = {
  farms: Farm[];
  markets: Market[];
  distributors: Distributor[];
  processors: Processor[];
  recoveryNodes: RecoveryNode[];
  enablers: Enabler[];
  statusFilter: "all" | "enrolled" | "engaged" | "prospect";
};

type SortKey = "name" | "type" | "location" | "status";
type SortDir = "asc" | "desc";

const KIND_ORDER: EntityKind[] = [
  "farm",
  "market",
  "distributor",
  "processor",
  "recovery_node",
  "enabler",
];

const KIND_LABEL: Record<EntityKind, string> = {
  farm: "Farm",
  market: "Market",
  distributor: "Distributor",
  processor: "Processor",
  recovery_node: "Recovery",
  enabler: "Enabler",
};

const KIND_COLOR: Record<EntityKind, string> = {
  farm: "#5B7B8A",
  market: "#B8860B",
  distributor: "#2C2A27",
  processor: "#4A6741",
  recovery_node: "#7A9BAD",
  enabler: "#6B6763",
};

const STATUS_ORDER: Record<string, number> = {
  enrolled: 0,
  engaged: 1,
  prospect: 2,
};

function farmCounty(f: Farm): string {
  return (
    (f.attributes as { county_name?: string } | null)?.county_name ?? ""
  );
}

function nameOf(e: NetworkEntity): string {
  return e.data.name ?? "";
}

function typeOf(e: NetworkEntity): string {
  switch (e.kind) {
    case "farm":
      return e.data.farm_type ?? "";
    case "market":
      return e.data.market_type ?? "";
    case "distributor":
      return e.data.distributor_type ?? "";
    case "processor":
      return e.data.processor_type ?? "";
    case "recovery_node":
      return e.data.recovery_node_type ?? "";
    case "enabler":
      return e.data.enabler_type ?? "";
  }
}

function locationOf(e: NetworkEntity): string {
  switch (e.kind) {
    case "farm":
      return farmCounty(e.data);
    case "market":
    case "distributor":
    case "processor":
      return e.data.address_text ?? "";
    case "recovery_node":
    case "enabler":
      return e.data.description ?? "";
  }
}

function statusOf(e: NetworkEntity): string {
  switch (e.kind) {
    case "farm":
    case "market":
    case "distributor":
    case "processor":
      return e.data.afs_member_status ?? "";
    case "recovery_node":
    case "enabler": {
      const active = (e.data.attributes as { afs_active?: boolean } | null)
        ?.afs_active;
      return active ? "afs_active" : "";
    }
  }
}

function subtypeLabel(e: NetworkEntity): string {
  return prettify(typeOf(e));
}

export function NetworkDirectory({
  farms,
  markets,
  distributors,
  processors,
  recoveryNodes,
  enablers,
  statusFilter,
}: Props) {
  const [selectedKinds, setSelectedKinds] = useState<Set<EntityKind>>(
    new Set(KIND_ORDER),
  );
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selected, setSelected] = useState<NetworkEntity | null>(null);

  const allEntities: NetworkEntity[] = useMemo(() => {
    const out: NetworkEntity[] = [];
    if (selectedKinds.has("farm")) {
      for (const f of farms) out.push({ kind: "farm", data: f });
    }
    if (selectedKinds.has("market")) {
      for (const m of markets) out.push({ kind: "market", data: m });
    }
    if (selectedKinds.has("distributor")) {
      for (const d of distributors) out.push({ kind: "distributor", data: d });
    }
    if (selectedKinds.has("processor")) {
      for (const p of processors) out.push({ kind: "processor", data: p });
    }
    if (selectedKinds.has("recovery_node")) {
      for (const r of recoveryNodes)
        out.push({ kind: "recovery_node", data: r });
    }
    if (selectedKinds.has("enabler")) {
      for (const en of enablers) out.push({ kind: "enabler", data: en });
    }
    return out;
  }, [
    farms,
    markets,
    distributors,
    processors,
    recoveryNodes,
    enablers,
    selectedKinds,
  ]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allEntities.filter((e) => {
      if (statusFilter !== "all" && statusOf(e) !== statusFilter) return false;
      if (q) {
        const blob = (
          nameOf(e) +
          " " +
          typeOf(e) +
          " " +
          locationOf(e)
        ).toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [allEntities, statusFilter, query]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = nameOf(a).localeCompare(nameOf(b));
      else if (sortKey === "type") cmp = KIND_LABEL[a.kind].localeCompare(KIND_LABEL[b.kind]);
      else if (sortKey === "location") cmp = locationOf(a).localeCompare(locationOf(b));
      else if (sortKey === "status") {
        const av = STATUS_ORDER[statusOf(a)] ?? 99;
        const bv = STATUS_ORDER[statusOf(b)] ?? 99;
        cmp = av - bv;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  function toggleKind(k: EntityKind) {
    const next = new Set(selectedKinds);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    setSelectedKinds(next);
  }

  function toggleSort(k: SortKey) {
    if (k === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(k);
      setSortDir("asc");
    }
  }

  function arrow(k: SortKey): string {
    if (k !== sortKey) return "";
    return sortDir === "asc" ? " ↑" : " ↓";
  }

  function headerButton(k: SortKey, label: string) {
    const active = k === sortKey;
    return (
      <button
        type="button"
        onClick={() => toggleSort(k)}
        className={
          "w-full text-left text-[11px] font-bold uppercase tracking-[0.08em] " +
          (active ? "text-charcoal" : "text-charcoal-soft") +
          " hover:text-slate-blue transition-colors"
        }
      >
        {label}
        <span className="font-mono">{arrow(k)}</span>
      </button>
    );
  }

  return (
    <div className="md:grid md:grid-cols-[1fr_340px] md:gap-5">
      <div className="rounded-[14px] border border-cream-shadow overflow-hidden bg-white">
        <div className="px-4 py-3 border-b border-cream-shadow bg-cream/40 flex flex-wrap items-center gap-3">
          {KIND_ORDER.map((k) => {
            const active = selectedKinds.has(k);
            return (
              <button
                key={k}
                type="button"
                onClick={() => toggleKind(k)}
                className={
                  "text-[11px] px-2.5 py-1 rounded-full border transition-colors " +
                  (active
                    ? "text-cream border-transparent"
                    : "bg-slate-pale text-charcoal-soft border-cream-shadow hover:border-slate-blue")
                }
                style={
                  active ? { background: KIND_COLOR[k], borderColor: KIND_COLOR[k] } : undefined
                }
              >
                {KIND_LABEL[k]}
              </button>
            );
          })}

          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, type, or location…"
            className="flex-1 min-w-[160px] bg-white border border-cream-shadow rounded-[8px] px-3 py-1.5 text-sm text-charcoal placeholder:text-charcoal-soft/70 focus:outline-none focus:border-slate-blue"
          />

          <span className="text-xs text-charcoal-soft tabular-nums whitespace-nowrap">
            {sorted.length} of {allEntities.length}
          </span>
        </div>

        {sorted.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-charcoal-soft">
            {allEntities.length === 0
              ? "Select at least one entity type above."
              : "Nothing matches your filters."}
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[540px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-cream-deep/60 border-b border-cream-shadow sticky top-0 z-10">
                <tr className="text-left">
                  <th className="px-4 py-3">{headerButton("name", "Name")}</th>
                  <th className="px-4 py-3">{headerButton("type", "Type")}</th>
                  <th className="px-4 py-3">{headerButton("location", "Location")}</th>
                  <th className="px-4 py-3">{headerButton("status", "Status")}</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((e) => {
                  const isSelected =
                    selected !== null &&
                    selected.kind === e.kind &&
                    selected.data.upid === e.data.upid;
                  return (
                    <tr
                      key={e.kind + ":" + e.data.upid}
                      onClick={() => setSelected(e)}
                      className={
                        "border-b border-cream-shadow/60 last:border-0 cursor-pointer transition-colors " +
                        (isSelected ? "bg-cream-deep" : "hover:bg-cream-deep/40")
                      }
                    >
                      <td className="px-4 py-2.5 text-charcoal font-medium">
                        {e.data.name}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className="inline-block px-2 py-0.5 rounded-[4px] text-[10px] font-medium text-cream"
                          style={{ background: KIND_COLOR[e.kind] }}
                        >
                          {KIND_LABEL[e.kind]}
                        </span>
                        <span className="ml-2 text-xs text-charcoal-soft">
                          {subtypeLabel(e)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-charcoal-soft">
                        {locationOf(e) || "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        {statusOf(e) ? (
                          <span
                            className={
                              "inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium " +
                              statusPillClasses(statusOf(e))
                            }
                          >
                            {statusLabel(statusOf(e))}
                          </span>
                        ) : (
                          <span className="text-charcoal-soft/60">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="hidden md:block">
        <EntityDetailPanel
          entity={selected}
          entityCount={sorted.length}
          hintToClick="Click any row to see details."
        />
      </div>
    </div>
  );
}

