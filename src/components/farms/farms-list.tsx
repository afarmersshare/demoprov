"use client";

import type { Farm } from "./farms-explorer";

function prettify(raw: string | null): string {
  if (!raw) return "—";
  return raw
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function FarmsList({ farms }: { farms: Farm[] }) {
  const sorted = [...farms].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 border-b border-gray-200">
            <tr className="text-left">
              <th className="px-4 py-2.5 font-medium text-zinc-700">Farm</th>
              <th className="px-4 py-2.5 font-medium text-zinc-700">County</th>
              <th className="px-4 py-2.5 font-medium text-zinc-700">Type</th>
              <th className="px-4 py-2.5 font-medium text-zinc-700 text-right">
                Acres
              </th>
              <th className="px-4 py-2.5 font-medium text-zinc-700">Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((farm) => {
              const countyName =
                (farm.attributes as { county_name?: string } | null)
                  ?.county_name ?? "—";
              const enrolled = farm.afs_member_status === "enrolled";
              return (
                <tr
                  key={farm.upid}
                  className="border-b border-gray-100 last:border-0 hover:bg-zinc-50"
                >
                  <td className="px-4 py-2 text-zinc-900">{farm.name}</td>
                  <td className="px-4 py-2 text-zinc-600">{countyName}</td>
                  <td className="px-4 py-2 text-zinc-600">
                    {prettify(farm.farm_type)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-zinc-600">
                    {farm.acres_total?.toLocaleString() ?? "—"}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={
                        "inline-block px-2 py-0.5 rounded-full text-xs font-medium " +
                        (enrolled
                          ? "bg-green-100 text-green-800"
                          : "bg-amber-100 text-amber-800")
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
