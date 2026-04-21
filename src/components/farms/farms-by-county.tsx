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
    <div className="rounded-[14px] border border-cream-shadow bg-white p-6">
      {rows.length === 0 ? (
        <div className="text-sm text-charcoal-soft">
          No farms match these filters — adjust above.
        </div>
      ) : (
        <div className="space-y-5">
          {rows.map((row) => {
            const enrolledPct = row.count > 0 ? (row.enrolled / row.count) * 100 : 0;
            return (
              <div key={row.name}>
                <div className="flex items-baseline justify-between mb-2 gap-4">
                  <div className="text-sm font-medium text-charcoal truncate">
                    {row.name}
                  </div>
                  <div className="text-xs text-charcoal-soft tabular-nums font-mono whitespace-nowrap">
                    {row.count} farm{row.count === 1 ? "" : "s"}
                    {" · "}
                    {row.enrolled} enrolled
                    {" · "}
                    {row.acres.toLocaleString()} ac
                  </div>
                </div>
                <div className="relative h-2.5 w-full bg-cream-deep rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-amber"
                    style={{ width: `${(row.count / maxCount) * 100}%` }}
                  />
                  <div
                    className="absolute inset-y-0 left-0 bg-moss"
                    style={{
                      width: `${((row.enrolled / maxCount) * 100).toFixed(2)}%`,
                    }}
                  />
                </div>
                <div className="mt-1 text-[11px] text-charcoal-soft tabular-nums">
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
