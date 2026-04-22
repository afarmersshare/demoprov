"use client";

import { useMemo, useState } from "react";
import type {
  Farm,
  Market,
  Distributor,
} from "./network-explorer";

type EntityKind = "farm" | "market" | "distributor";

type DirectoryEntity =
  | { kind: "farm"; data: Farm }
  | { kind: "market"; data: Market }
  | { kind: "distributor"; data: Distributor };

type Props = {
  farms: Farm[];
  markets: Market[];
  distributors: Distributor[];
  statusFilter: "all" | "enrolled" | "engaged" | "prospect";
};

type SortKey = "name" | "type" | "location" | "status";
type SortDir = "asc" | "desc";

const KIND_LABEL: Record<EntityKind, string> = {
  farm: "Farm",
  market: "Market",
  distributor: "Distributor",
};

const KIND_COLOR: Record<EntityKind, string> = {
  farm: "#2f4a3a",
  market: "#c77f2a",
  distributor: "#7a8aa0",
};

const STATUS_ORDER: Record<string, number> = {
  enrolled: 0,
  engaged: 1,
  prospect: 2,
};

function prettify(raw: string | null | undefined): string {
  if (!raw) return "—";
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusPillClasses(status: string | null | undefined): string {
  if (status === "enrolled") return "bg-moss text-cream";
  if (status === "engaged") return "bg-amber text-cream";
  if (status === "prospect") return "bg-terracotta text-cream";
  return "bg-bone text-charcoal";
}

function farmCounty(f: Farm): string {
  return (
    (f.attributes as { county_name?: string } | null)?.county_name ?? ""
  );
}

function nameOf(e: DirectoryEntity): string {
  return e.data.name ?? "";
}

function typeOf(e: DirectoryEntity): string {
  if (e.kind === "farm") return e.data.farm_type ?? "";
  if (e.kind === "market") return e.data.market_type ?? "";
  return e.data.distributor_type ?? "";
}

function locationOf(e: DirectoryEntity): string {
  if (e.kind === "farm") return farmCounty(e.data);
  return e.data.address_text ?? "";
}

function statusOf(e: DirectoryEntity): string {
  return e.data.afs_member_status ?? "";
}

function subtypeLabel(e: DirectoryEntity): string {
  return prettify(typeOf(e));
}

export function NetworkDirectory({
  farms,
  markets,
  distributors,
  statusFilter,
}: Props) {
  const [selectedKinds, setSelectedKinds] = useState<Set<EntityKind>>(
    new Set(["farm", "market", "distributor"]),
  );
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selected, setSelected] = useState<DirectoryEntity | null>(null);

  const allEntities: DirectoryEntity[] = useMemo(() => {
    const out: DirectoryEntity[] = [];
    if (selectedKinds.has("farm")) {
      for (const f of farms) out.push({ kind: "farm", data: f });
    }
    if (selectedKinds.has("market")) {
      for (const m of markets) out.push({ kind: "market", data: m });
    }
    if (selectedKinds.has("distributor")) {
      for (const d of distributors) out.push({ kind: "distributor", data: d });
    }
    return out;
  }, [farms, markets, distributors, selectedKinds]);

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
          " hover:text-moss transition-colors"
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
          {(["farm", "market", "distributor"] as EntityKind[]).map((k) => {
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
                    : "bg-bone text-charcoal-soft border-cream-shadow hover:border-moss")
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
            className="flex-1 min-w-[160px] bg-white border border-cream-shadow rounded-[8px] px-3 py-1.5 text-sm text-charcoal placeholder:text-charcoal-soft/70 focus:outline-none focus:border-moss"
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
                        <span
                          className={
                            "inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium " +
                            statusPillClasses(statusOf(e))
                          }
                        >
                          {prettify(statusOf(e))}
                        </span>
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
        <DirectoryDetailPanel entity={selected} totalInView={sorted.length} />
      </div>
    </div>
  );
}

function DirectoryDetailPanel({
  entity,
  totalInView,
}: {
  entity: DirectoryEntity | null;
  totalInView: number;
}) {
  if (!entity) {
    return (
      <div className="rounded-[14px] border border-cream-shadow bg-white p-6 h-[600px] flex flex-col">
        <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft">
          Details
        </div>
        <div className="mt-auto mb-auto text-center px-2">
          <div className="text-charcoal-soft text-sm leading-relaxed">
            Click any row to see details.
          </div>
          <div className="mt-3 text-xs text-charcoal-soft/70">
            {totalInView.toLocaleString()} result{totalInView === 1 ? "" : "s"} in view.
          </div>
        </div>
      </div>
    );
  }

  const rows = detailRows(entity);
  const locationLabel = locationOf(entity);

  return (
    <div className="rounded-[14px] border border-cream-shadow bg-white p-6 h-[600px] overflow-y-auto flex flex-col">
      <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft mb-3">
        {KIND_LABEL[entity.kind]}
      </div>

      <div className="font-display text-[24px] font-semibold text-moss leading-[1.2] tracking-[-0.015em]">
        {entity.data.name}
      </div>
      {locationLabel ? (
        <div className="mt-1 text-sm text-charcoal-soft">{locationLabel}</div>
      ) : null}

      {statusOf(entity) ? (
        <div className="mt-5">
          <span
            className={
              "inline-block px-2.5 py-1 rounded-full text-[11px] font-medium " +
              statusPillClasses(statusOf(entity))
            }
          >
            {prettify(statusOf(entity))}
          </span>
        </div>
      ) : null}

      <dl className="mt-6 space-y-0">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex justify-between gap-4 border-t border-cream-shadow py-3 first:border-t-0 first:pt-0 text-sm"
          >
            <dt className="text-charcoal-soft">{label}</dt>
            <dd className="m-0 text-charcoal font-semibold text-right">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function detailRows(e: DirectoryEntity): Array<[string, string]> {
  const money = (v: number | null | undefined) =>
    v == null
      ? "—"
      : v.toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        });
  if (e.kind === "farm") {
    const f = e.data;
    const rows: Array<[string, string]> = [
      ["Farm type", prettify(f.farm_type)],
      ["Acres", f.acres_total?.toLocaleString() ?? "—"],
    ];
    if (f.gross_revenue_baseline != null) {
      rows.push([
        `Revenue (${f.gross_revenue_baseline_year ?? "baseline"})`,
        money(f.gross_revenue_baseline),
      ]);
    }
    if (f.afs_priority_tier) {
      rows.push(["Priority tier", prettify(f.afs_priority_tier)]);
    }
    return rows;
  }
  if (e.kind === "market") {
    const m = e.data;
    const rows: Array<[string, string]> = [
      ["Market type", prettify(m.market_type)],
    ];
    if (m.afs_priority_tier) {
      rows.push(["Priority tier", prettify(m.afs_priority_tier)]);
    }
    return rows;
  }
  // distributor
  const d = e.data;
  const rows: Array<[string, string]> = [
    ["Distributor type", prettify(d.distributor_type)],
  ];
  if (d.afs_priority_tier) {
    rows.push(["Priority tier", prettify(d.afs_priority_tier)]);
  }
  return rows;
}
