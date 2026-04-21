"use client";

import type { Farm } from "./farms-explorer";

type CountyStats = {
  name: string;
  count: number;
  enrolled: number;
  engaged: number;
  prospect: number;
  acres: number;
};

export function FarmsByCounty({ farms }: { farms: Farm[] }) {
  const byCounty = new Map<string, CountyStats>();

  for (const farm of farms) {
    const name =
      (farm.attributes as { county_name?: string } | null)?.county_name ??
      "Unknown county";
    const entry =
      byCounty.get(name) ?? {
        name,
        count: 0,
        enrolled: 0,
        engaged: 0,
        prospect: 0,
        acres: 0,
      };
    entry.count += 1;
    if (farm.afs_member_status === "enrolled") entry.enrolled += 1;
    else if (farm.afs_member_status === "engaged") entry.engaged += 1;
    else if (farm.afs_member_status === "prospect") entry.prospect += 1;
    entry.acres += farm.acres_total ?? 0;
    byCounty.set(name, entry);
  }

  const rows = Array.from(byCounty.values()).sort((a, b) => b.count - a.count);
  const maxCount = Math.max(1, ...rows.map((r) => r.count));

  if (rows.length === 0) {
    return (
      <div className="rounded-[14px] border border-cream-shadow bg-white p-6">
        <div className="text-sm text-charcoal-soft">
          No farms match these filters — adjust above.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[14px] border border-cream-shadow bg-white p-6">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-6 text-[11px] text-charcoal-soft">
        <LegendSwatch color="bg-moss" label="Enrolled" />
        <LegendSwatch color="bg-amber" label="Engaged" />
        <LegendSwatch color="bg-terracotta" label="Prospect" />
      </div>

      <div className="space-y-5">
        {rows.map((row) => (
          <div key={row.name}>
            <div className="flex items-baseline justify-between mb-2 gap-4">
              <div className="text-sm font-medium text-charcoal truncate">
                {row.name}
              </div>
              <div className="text-xs text-charcoal-soft tabular-nums font-mono whitespace-nowrap">
                {row.count} farm{row.count === 1 ? "" : "s"}
                {" · "}
                {row.acres.toLocaleString()} ac
              </div>
            </div>
            <div className="flex h-2.5 w-full bg-cream-deep rounded-full overflow-hidden">
              <div
                className="bg-moss h-full"
                style={{ width: `${(row.enrolled / maxCount) * 100}%` }}
              />
              <div
                className="bg-amber h-full"
                style={{ width: `${(row.engaged / maxCount) * 100}%` }}
              />
              <div
                className="bg-terracotta h-full"
                style={{ width: `${(row.prospect / maxCount) * 100}%` }}
              />
            </div>
            <div className="mt-1 text-[11px] text-charcoal-soft tabular-nums">
              {row.enrolled} enrolled · {row.engaged} engaged ·{" "}
              {row.prospect} prospect
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={"inline-block w-2.5 h-2.5 rounded-full " + color} />
      {label}
    </span>
  );
}
