"use client";

import type { Farm } from "./farms-explorer";

function prettify(raw: string | null): string {
  if (!raw) return "—";
  return raw
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusPillClasses(status: string | null): string {
  if (status === "enrolled") return "bg-moss text-cream";
  if (status === "engaged") return "bg-amber text-cream";
  if (status === "prospect") return "bg-terracotta text-cream";
  return "bg-bone text-charcoal";
}

export function FarmsList({ farms }: { farms: Farm[] }) {
  const sorted = [...farms].sort((a, b) => a.name.localeCompare(b.name));

  if (sorted.length === 0) {
    return (
      <div className="rounded-[14px] border border-cream-shadow bg-white px-5 py-10 text-center text-sm text-charcoal-soft">
        No farms match these filters — adjust above.
      </div>
    );
  }

  return (
    <div className="rounded-[14px] border border-cream-shadow overflow-hidden bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-cream-deep/60 border-b border-cream-shadow">
            <tr className="text-left">
              <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-charcoal-soft">
                Farm
              </th>
              <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-charcoal-soft">
                County
              </th>
              <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-charcoal-soft">
                Type
              </th>
              <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-charcoal-soft text-right">
                Acres
              </th>
              <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-charcoal-soft">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((farm) => {
              const countyName =
                (farm.attributes as { county_name?: string } | null)
                  ?.county_name ?? "—";
              return (
                <tr
                  key={farm.upid}
                  className="border-b border-cream-shadow/60 last:border-0 hover:bg-cream-deep/40 transition-colors"
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
    </div>
  );
}
