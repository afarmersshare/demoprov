"use client";

import type { Farm } from "./farms-explorer";

function prettify(raw: string | null): string {
  if (!raw) return "—";
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCurrency(amount: number | null): string {
  if (amount == null) return "—";
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function statusPillClasses(status: string | null): string {
  if (status === "enrolled") return "bg-moss text-cream";
  if (status === "engaged") return "bg-amber text-cream";
  if (status === "prospect") return "bg-terracotta text-cream";
  return "bg-bone text-charcoal";
}

type Props = {
  farm: Farm | null;
  farmCount: number;
};

export function FarmDetailPanel({ farm, farmCount }: Props) {
  if (!farm) {
    return (
      <div className="rounded-[14px] border border-cream-shadow bg-white p-6 h-[600px] flex flex-col">
        <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft">
          Farm details
        </div>
        <div className="mt-auto mb-auto text-center px-2">
          <div className="text-charcoal-soft text-sm leading-relaxed">
            Click any marker on the map to see details for that farm.
          </div>
          <div className="mt-3 text-xs text-charcoal-soft/70">
            {farmCount.toLocaleString()} farm{farmCount === 1 ? "" : "s"} in
            view.
          </div>
        </div>
      </div>
    );
  }

  const countyName =
    (farm.attributes as { county_name?: string } | null)?.county_name ?? null;

  return (
    <div className="rounded-[14px] border border-cream-shadow bg-white p-6 h-[600px] overflow-y-auto">
      <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft mb-3">
        Farm details
      </div>

      <div className="font-display text-[24px] font-semibold text-moss leading-[1.2] tracking-[-0.015em]">
        {farm.name}
      </div>
      {countyName ? (
        <div className="mt-1 text-sm text-charcoal-soft">{countyName}</div>
      ) : null}

      <div className="mt-5">
        <span
          className={
            "inline-block px-2.5 py-1 rounded-full text-[11px] font-medium " +
            statusPillClasses(farm.afs_member_status)
          }
        >
          {prettify(farm.afs_member_status)}
        </span>
      </div>

      <dl className="mt-6 space-y-0">
        <Row label="Farm type" value={prettify(farm.farm_type)} />
        <Row
          label="Acres"
          value={farm.acres_total?.toLocaleString() ?? "—"}
          numeric
        />
        {farm.gross_revenue_baseline != null ? (
          <Row
            label={`Revenue (${
              farm.gross_revenue_baseline_year ?? "baseline"
            })`}
            value={formatCurrency(farm.gross_revenue_baseline)}
            numeric
          />
        ) : null}
        {farm.afs_priority_tier ? (
          <Row
            label="Priority tier"
            value={prettify(farm.afs_priority_tier)}
          />
        ) : null}
      </dl>
    </div>
  );
}

function Row({
  label,
  value,
  numeric = false,
}: {
  label: string;
  value: string;
  numeric?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4 border-t border-cream-shadow py-3 first:border-t-0 first:pt-0 text-sm">
      <dt className="text-charcoal-soft">{label}</dt>
      <dd
        className={
          "text-charcoal font-semibold text-right" +
          (numeric ? " tabular-nums" : "")
        }
      >
        {value}
      </dd>
    </div>
  );
}
