"use client";

import type { Farm } from "./farms-explorer";

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
    <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
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
        accent="emerald"
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
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: "emerald";
}) {
  const valueClass =
    accent === "emerald"
      ? "text-emerald-700"
      : "text-zinc-900";
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
      <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </div>
      <div
        className={`mt-1 text-2xl font-semibold tabular-nums leading-none ${valueClass}`}
      >
        {value}
      </div>
      <div className="mt-1.5 text-xs text-zinc-500">{sub}</div>
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
