"use client";

import { useMemo, useState } from "react";
import type { Farm } from "./network-explorer";

function prettify(raw: string | null): string {
  if (!raw) return "—";
  return raw
    .replace(/_/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}

function statusPillClasses(status: string | null): string {
  if (status === "enrolled") return "bg-forest-sage text-warm-cream";
  if (status === "engaged") return "bg-accent-amber text-warm-cream";
  if (status === "prospect") return "bg-slate-blue-light text-warm-cream";
  return "bg-slate-pale text-charcoal";
}

type SortKey = "name" | "county" | "type" | "acres" | "status";
type SortDir = "asc" | "desc";

const STATUS_ORDER: Record<string, number> = {
  enrolled: 0,
  engaged: 1,
  prospect: 2,
};

function countyOf(farm: Farm): string {
  return (
    (farm.attributes as { county_name?: string } | null)?.county_name ?? ""
  );
}

function compareFarms(a: Farm, b: Farm, key: SortKey): number {
  switch (key) {
    case "name":
      return a.name.localeCompare(b.name);
    case "county":
      return countyOf(a).localeCompare(countyOf(b));
    case "type":
      return (a.farm_type ?? "").localeCompare(b.farm_type ?? "");
    case "acres":
      return (a.acres_total ?? -1) - (b.acres_total ?? -1);
    case "status": {
      const av = STATUS_ORDER[a.afs_member_status ?? ""] ?? 99;
      const bv = STATUS_ORDER[b.afs_member_status ?? ""] ?? 99;
      return av - bv;
    }
  }
}

type Props = {
  farms: Farm[];
  selected: Farm | null;
  onSelect: (farm: Farm | null) => void;
};

export function FarmsList({ farms, selected, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return farms;
    return farms.filter((f) => {
      if (f.name.toLowerCase().includes(q)) return true;
      if (countyOf(f).toLowerCase().includes(q)) return true;
      if ((f.farm_type ?? "").toLowerCase().includes(q)) return true;
      return false;
    });
  }, [farms, query]);

  const sorted = useMemo(() => {
    const arr = [...searched];
    arr.sort((a, b) => {
      const cmp = compareFarms(a, b, sortKey);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [searched, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "acres" ? "desc" : "asc");
    }
  }

  function arrow(key: SortKey): string {
    if (key !== sortKey) return "";
    return sortDir === "asc" ? " ↑" : " ↓";
  }

  function headerButton(
    key: SortKey,
    label: string,
    align: "left" | "right" = "left",
  ) {
    const active = key === sortKey;
    return (
      <button
        type="button"
        onClick={() => toggleSort(key)}
        className={
          "w-full text-[11px] font-bold uppercase tracking-[0.08em] " +
          (active ? "text-charcoal" : "text-charcoal-soft") +
          " hover:text-slate-blue transition-colors " +
          (align === "right" ? "text-right" : "text-left")
        }
      >
        {label}
        <span className="font-mono">{arrow(key)}</span>
      </button>
    );
  }

  const emptyMessage =
    farms.length === 0
      ? "No farms match these filters — adjust above."
      : "No farms match your search.";

  return (
    <div className="rounded-[14px] border border-cream-shadow overflow-hidden bg-white">
      <div className="px-4 py-3 border-b border-cream-shadow bg-cream/40 flex items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search farms by name, county, or type…"
          className="flex-1 min-w-0 bg-white border border-cream-shadow rounded-[8px] px-3 py-1.5 text-sm text-charcoal placeholder:text-charcoal-soft/70 focus:outline-none focus:border-slate-blue"
        />
        <span className="text-xs text-charcoal-soft tabular-nums whitespace-nowrap">
          {sorted.length} of {farms.length}
        </span>
      </div>

      {sorted.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-charcoal-soft">
          {emptyMessage}
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[540px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-cream-deep/60 border-b border-cream-shadow sticky top-0 z-10">
              <tr className="text-left">
                <th className="px-4 py-3">{headerButton("name", "Farm")}</th>
                <th className="px-4 py-3">{headerButton("county", "County")}</th>
                <th className="px-4 py-3">{headerButton("type", "Type")}</th>
                <th className="px-4 py-3">
                  {headerButton("acres", "Acres", "right")}
                </th>
                <th className="px-4 py-3">{headerButton("status", "Status")}</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((farm) => {
                const countyName = countyOf(farm) || "—";
                const isSelected = selected?.upid === farm.upid;
                return (
                  <tr
                    key={farm.upid}
                    onClick={() => onSelect(farm)}
                    className={
                      "border-b border-cream-shadow/60 last:border-0 cursor-pointer transition-colors " +
                      (isSelected
                        ? "bg-cream-deep"
                        : "hover:bg-cream-deep/40")
                    }
                  >
                    <td className="px-4 py-2.5 text-charcoal font-medium">
                      {farm.name}
                    </td>
                    <td className="px-4 py-2.5 text-charcoal-soft">
                      {countyName}
                    </td>
                    <td className="px-4 py-2.5 text-charcoal-soft">
                      {prettify(farm.farm_type)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-charcoal-soft font-mono">
                      {farm.acres_total?.toLocaleString() ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={
                          "inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium " +
                          statusPillClasses(farm.afs_member_status)
                        }
                      >
                        {prettify(farm.afs_member_status)}
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
  );
}
