"use client";

import type { Farm } from "./farms-explorer";

type CountyStats = {
  name: string;
  count: number;
  enrolled: number;
  acres: number;
};

export function FarmsByCounty({ farms }: { farms: Farm[] }) {
  const byCounty = new Map<string, CountyStats>();

  for (const farm of farms) {
    const name =
      (farm.attributes as { county_name?: string } | null)?.county_name ??
      "Unknown county";
    const entry =
      byCounty.get(name) ?? { name, count: 0, enrolled: 0, acres: 0 };
    entry.count += 1;
    if (farm.afs_member_status === "enrolled") entry.enrolled += 1;
    entry.acres += farm.acres_total ?? 0;
    byCounty.set(name, entry);
  }

  const rows = Array.from(byCounty.values()).sort((a, b) => b.count - a.count);
  const maxCount = Math.max(1, ...rows.map((r) => r.count));

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      {rows.length === 0 ? (
        <div className="text-sm text-zinc-500">No farms to summarize yet.</div>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => {
            const enrolledPct = row.count > 0 ? (row.enrolled / row.count) * 100 : 0;
            return (
              <div key={row.name}>
                <div className="flex items-baseline justify-between mb-1.5 gap-4">
                  <div className="text-sm font-medium text-zinc-900 truncate">
                    {row.name}
                  </div>
                  <div className="text-xs text-zinc-600 tabular-nums whitespace-nowrap">
                    {row.count} farm{row.count === 1 ? "" : "s"}
                    {" · "}
                    {row.enrolled} enrolled
                    {" · "}
                    {row.acres.toLocaleString()} acres
                  </div>
                </div>
                <div className="relative h-2.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-amber-400"
                    style={{ width: `${(row.count / maxCount) * 100}%` }}
                  />
                  <div
                    className="absolute inset-y-0 left-0 bg-emerald-600"
                    style={{
                      width: `${((row.enrolled / maxCount) * 100).toFixed(2)}%`,
                    }}
                  />
                </div>
                <div className="mt-0.5 text-[11px] text-zinc-500 tabular-nums">
                  {enrolledPct.toFixed(0)}% enrolled
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
