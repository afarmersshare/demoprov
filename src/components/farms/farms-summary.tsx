"use client";

import type { Farm } from "./network-explorer";

type Props = {
  filteredFarms: Farm[];
  totalFarms: Farm[];
  filterActive: boolean;
};

export function FarmsSummary({ filteredFarms, totalFarms, filterActive }: Props) {
  const totalCount = totalFarms.length;
  const farmCount = filteredFarms.length;

  const acres = sum(filteredFarms.map((f) => f.acres_total ?? 0));
  const totalAcres = sum(totalFarms.map((f) => f.acres_total ?? 0));

  const enrolled = filteredFarms.filter(
    (f) => f.afs_member_status === "enrolled",
  ).length;
  const enrolledPct = farmCount > 0 ? (enrolled / farmCount) * 100 : 0;

  const counties = uniqueCounties(filteredFarms);
  const totalCounties = uniqueCounties(totalFarms);

  return (
    <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card
        label="Farms"
        value={farmCount.toLocaleString()}
        sub={
          filterActive
            ? `of ${totalCount.toLocaleString()} total`
            : "in view"
        }
      />
      <Card
        label="Acres"
        value={acres.toLocaleString()}
        sub={
          filterActive && totalAcres > 0
            ? `${pct(acres, totalAcres)}% of total`
            : "across all farms"
        }
      />
      <Card
        label="AFS enrolled"
        value={enrolled.toLocaleString()}
        sub={
          farmCount > 0
            ? `${enrolledPct.toFixed(0)}% of farms in view`
            : "—"
        }
      />
      <Card
        label="Counties"
        value={counties.toLocaleString()}
        sub={
          filterActive
            ? `of ${totalCounties.toLocaleString()} total`
            : "in view"
        }
      />
    </div>
  );
}

function Card({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-[14px] border border-cream-shadow bg-white px-6 py-6 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(31,36,33,0.06)]">
      <div className="font-mono text-[40px] font-bold leading-none text-moss tabular-nums">
        {value}
      </div>
      <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-charcoal-soft">
        {label}
      </div>
      <div className="mt-1 text-xs text-charcoal-soft/80">{sub}</div>
    </div>
  );
}

function sum(xs: number[]): number {
  let n = 0;
  for (const x of xs) n += x;
  return n;
}

function pct(a: number, b: number): number {
  if (b === 0) return 0;
  return Math.round((a / b) * 100);
}

function uniqueCounties(farms: Farm[]): number {
  const set = new Set<string>();
  for (const f of farms) {
    const name = (f.attributes as { county_name?: string } | null)?.county_name;
    if (name) set.add(name);
  }
  return set.size;
}
