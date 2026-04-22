"use client";

import { X } from "lucide-react";
import type { NetworkEntity } from "./network-explorer";

function prettify(raw: string | null | undefined): string {
  if (!raw) return "—";
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

const KIND_LABEL: Record<NetworkEntity["kind"], string> = {
  farm: "Farm",
  market: "Market",
  distributor: "Distributor",
};

function statusPillClasses(status: string | null | undefined): string {
  if (status === "enrolled") return "bg-moss text-cream";
  if (status === "engaged") return "bg-amber text-cream";
  if (status === "prospect") return "bg-terracotta text-cream";
  return "bg-bone text-charcoal";
}

function subhead(e: NetworkEntity): string | null {
  if (e.kind === "farm") {
    return (
      (e.data.attributes as { county_name?: string } | null)?.county_name ??
      null
    );
  }
  return e.data.address_text ?? null;
}

function status(e: NetworkEntity): string | null {
  return e.data.afs_member_status ?? null;
}

function detailRows(e: NetworkEntity): Array<[string, string]> {
  if (e.kind === "farm") {
    const f = e.data;
    const rows: Array<[string, string]> = [
      ["Farm type", prettify(f.farm_type)],
      ["Acres", f.acres_total?.toLocaleString() ?? "—"],
    ];
    if (f.gross_revenue_baseline != null) {
      rows.push([
        `Revenue (${f.gross_revenue_baseline_year ?? "baseline"})`,
        formatCurrency(f.gross_revenue_baseline),
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
  const d = e.data;
  const rows: Array<[string, string]> = [
    ["Distributor type", prettify(d.distributor_type)],
  ];
  if (d.afs_priority_tier) {
    rows.push(["Priority tier", prettify(d.afs_priority_tier)]);
  }
  return rows;
}

function Body({
  entity,
  entityCount,
  hintToClick,
}: {
  entity: NetworkEntity | null;
  entityCount: number;
  hintToClick: string;
}) {
  if (!entity) {
    return (
      <>
        <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft">
          Details
        </div>
        <div className="mt-auto mb-auto text-center px-2">
          <div className="text-charcoal-soft text-sm leading-relaxed">
            {hintToClick}
          </div>
          <div className="mt-3 text-xs text-charcoal-soft/70">
            {entityCount.toLocaleString()} pin
            {entityCount === 1 ? "" : "s"} in view.
          </div>
        </div>
      </>
    );
  }

  const sub = subhead(entity);
  const st = status(entity);
  const rows = detailRows(entity);

  return (
    <>
      <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft mb-3">
        {KIND_LABEL[entity.kind]}
      </div>

      <div className="font-display text-[24px] font-semibold text-moss leading-[1.2] tracking-[-0.015em]">
        {entity.data.name}
      </div>
      {sub ? <div className="mt-1 text-sm text-charcoal-soft">{sub}</div> : null}

      {st ? (
        <div className="mt-5">
          <span
            className={
              "inline-block px-2.5 py-1 rounded-full text-[11px] font-medium " +
              statusPillClasses(st)
            }
          >
            {prettify(st)}
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
    </>
  );
}

export function EntityDetailPanel({
  entity,
  entityCount,
  hintToClick = "Click any marker on the map to see details.",
}: {
  entity: NetworkEntity | null;
  entityCount: number;
  hintToClick?: string;
}) {
  return (
    <div className="rounded-[14px] border border-cream-shadow bg-white p-6 h-[600px] overflow-y-auto flex flex-col">
      <Body
        entity={entity}
        entityCount={entityCount}
        hintToClick={hintToClick}
      />
    </div>
  );
}

export function EntityDetailOverlay({
  entity,
  entityCount,
  onClose,
}: {
  entity: NetworkEntity | null;
  entityCount: number;
  onClose: () => void;
}) {
  if (!entity) return null;
  return (
    <div className="md:hidden fixed inset-0 z-50 flex items-stretch">
      <div
        className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative m-4 w-full bg-white rounded-[14px] border border-cream-shadow p-6 overflow-y-auto max-h-[calc(100vh-2rem)]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-cream-deep hover:bg-cream-shadow flex items-center justify-center text-charcoal-soft transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <Body entity={entity} entityCount={entityCount} hintToClick="" />
      </div>
    </div>
  );
}
