"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { NetworkEntity } from "./network-explorer";

export function prettify(raw: string | null | undefined): string {
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
  processor: "Processor",
  recovery_node: "Recovery Node",
  enabler: "Enabler",
};

export function statusPillClasses(status: string | null | undefined): string {
  if (status === "enrolled") return "bg-moss text-cream";
  if (status === "engaged") return "bg-amber text-cream";
  if (status === "prospect") return "bg-terracotta text-cream";
  if (status === "afs_active") return "bg-moss-light text-charcoal";
  return "bg-bone text-charcoal";
}

function subhead(e: NetworkEntity): string | null {
  switch (e.kind) {
    case "farm":
      return (
        (e.data.attributes as { county_name?: string } | null)?.county_name ??
        null
      );
    case "market":
    case "distributor":
    case "processor":
      return e.data.address_text ?? null;
    case "recovery_node":
    case "enabler":
      return e.data.description ?? null;
  }
}

function status(e: NetworkEntity): string | null {
  switch (e.kind) {
    case "farm":
    case "market":
    case "distributor":
    case "processor":
      return e.data.afs_member_status ?? null;
    case "recovery_node":
    case "enabler": {
      const active = (e.data.attributes as { afs_active?: boolean } | null)
        ?.afs_active;
      return active ? "afs_active" : null;
    }
  }
}

export function statusLabel(s: string): string {
  if (s === "afs_active") return "AFS partner";
  return prettify(s);
}

function detailRows(e: NetworkEntity): Array<[string, string]> {
  switch (e.kind) {
    case "farm": {
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
    case "market": {
      const m = e.data;
      const rows: Array<[string, string]> = [
        ["Market type", prettify(m.market_type)],
      ];
      if (m.afs_priority_tier) {
        rows.push(["Priority tier", prettify(m.afs_priority_tier)]);
      }
      return rows;
    }
    case "distributor": {
      const d = e.data;
      const rows: Array<[string, string]> = [
        ["Distributor type", prettify(d.distributor_type)],
      ];
      if (d.afs_priority_tier) {
        rows.push(["Priority tier", prettify(d.afs_priority_tier)]);
      }
      return rows;
    }
    case "processor": {
      const p = e.data;
      const attrs = (p.attributes ?? {}) as Record<string, unknown>;
      const rows: Array<[string, string]> = [
        ["Processor type", prettify(p.processor_type)],
      ];
      if (typeof attrs.capacity_kg_per_day === "number") {
        rows.push([
          "Capacity",
          `${attrs.capacity_kg_per_day.toLocaleString()} kg/day`,
        ]);
      }
      if (attrs.gfsi_certified) {
        const scheme = attrs.gfsi_scheme;
        rows.push([
          "GFSI certified",
          typeof scheme === "string" ? scheme.toUpperCase() : "Yes",
        ]);
      }
      if (attrs.usda_inspected) rows.push(["USDA inspected", "Yes"]);
      if (attrs.shared_space) rows.push(["Shared space", "Yes"]);
      if (p.afs_priority_tier) {
        rows.push(["Priority tier", prettify(p.afs_priority_tier)]);
      }
      return rows;
    }
    case "recovery_node": {
      const r = e.data;
      const attrs = (r.attributes ?? {}) as Record<string, unknown>;
      const rows: Array<[string, string]> = [
        ["Type", prettify(r.recovery_node_type)],
      ];
      if (typeof attrs.capacity_pounds_per_week === "number") {
        rows.push([
          "Capacity",
          `${attrs.capacity_pounds_per_week.toLocaleString()} lbs/week`,
        ]);
      }
      if (attrs.has_cold_storage) rows.push(["Cold storage", "Yes"]);
      if (attrs.has_freezer) rows.push(["Freezer", "Yes"]);
      if (attrs.accepts_perishables)
        rows.push(["Accepts perishables", "Yes"]);
      if (attrs.pickup_capable) rows.push(["Pickup capable", "Yes"]);
      return rows;
    }
    case "enabler": {
      const en = e.data;
      const attrs = (en.attributes ?? {}) as Record<string, unknown>;
      const rows: Array<[string, string]> = [
        ["Type", prettify(en.enabler_type)],
      ];
      if (typeof attrs.founded_year === "number") {
        rows.push(["Founded", String(attrs.founded_year)]);
      }
      if (typeof attrs.staff_count === "number") {
        rows.push(["Staff", attrs.staff_count.toLocaleString()]);
      }
      if (typeof attrs.annual_budget_usd === "number") {
        rows.push(["Annual budget", formatCurrency(attrs.annual_budget_usd)]);
      }
      if (typeof attrs.service_radius_miles === "number") {
        rows.push(["Service radius", `${attrs.service_radius_miles} mi`]);
      }
      if (attrs.usda_funded) rows.push(["USDA funded", "Yes"]);
      return rows;
    }
  }
}

type EntityDocument = {
  node_document_upid: string;
  document_upid: string;
  title: string;
  document_type: string;
  issued_date: string | null;
  expires_date: string | null;
  issuing_body: string | null;
  computed_status: "current" | "expiring_soon" | "expired" | "superseded";
  days_until_expiry: number | null;
};

const DOC_TYPE_LABEL: Record<string, string> = {
  gap_cert: "GAP Certificate",
  organic_cert: "USDA Organic",
  real_organic_cert: "Real Organic Project",
  gfsi_sqf: "SQF (GFSI)",
  gfsi_brc: "BRCGS (GFSI)",
  gfsi_primus: "PrimusGFS (GFSI)",
  haccp_plan: "HACCP Plan",
  food_safety_plan: "FSMA Food Safety Plan",
  cold_chain_audit: "Cold Chain Audit",
  liability_insurance: "General Liability",
  product_liability_insurance: "Product Liability",
  auto_insurance: "Commercial Auto",
  workers_comp: "Workers' Comp",
  water_test: "Water Test",
  soil_test: "Soil Test",
  usdot_authority: "USDOT Authority",
  food_handler_permit: "Food Handler Permit",
  wic_authorization: "WIC Authorization",
  snap_authorization: "SNAP Authorization",
  "501c3_determination": "501(c)(3) Letter",
  board_roster: "Board Roster",
  w9: "W-9",
  usda_grant_award: "USDA Grant Award",
  lease_agreement: "Land Lease",
  certification_cert: "Certification",
  contract: "Contract",
  invoice: "Invoice",
  inspection_report: "Inspection Report",
  consent_form: "Consent Form",
  photo: "Photo",
  financial_statement: "Financial Statement",
  permit: "Permit",
  other: "Other",
};

const DOC_STATUS_SORT: Record<string, number> = {
  expired: 0,
  expiring_soon: 1,
  current: 2,
  superseded: 3,
};

function docTypeLabel(type: string): string {
  return DOC_TYPE_LABEL[type] ?? prettify(type);
}

function docStatusPillClasses(status: string): string {
  switch (status) {
    case "current":
      return "bg-moss/10 text-moss";
    case "expiring_soon":
      return "bg-amber/15 text-amber";
    case "expired":
      return "bg-terracotta/15 text-terracotta";
    case "superseded":
      return "bg-charcoal-soft/15 text-charcoal-soft";
    default:
      return "bg-bone text-charcoal-soft";
  }
}

function docStatusLabel(status: string, days: number | null): string {
  switch (status) {
    case "current":
      return "Current";
    case "expiring_soon":
      return days != null ? `Expires ${days}d` : "Expiring";
    case "expired":
      return days != null ? `Expired ${Math.abs(days)}d ago` : "Expired";
    case "superseded":
      return "Superseded";
    default:
      return status;
  }
}

function DocumentsSection({ entityUpid }: { entityUpid: string }) {
  const [docs, setDocs] = useState<EntityDocument[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDocs(null);
    setError(null);
    const supabase = createClient();
    supabase
      .from("v_document_status")
      .select(
        "node_document_upid, document_upid, title, document_type, issued_date, expires_date, issuing_body, computed_status, days_until_expiry",
      )
      .eq("node_upid", entityUpid)
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) {
          setError(err.message);
          return;
        }
        setDocs((data ?? []) as EntityDocument[]);
      });
    return () => {
      cancelled = true;
    };
  }, [entityUpid]);

  if (error) {
    return (
      <div className="mt-6 text-xs text-terracotta">
        Couldn&rsquo;t load documents: {error}
      </div>
    );
  }

  if (docs === null) {
    return (
      <div className="mt-6 text-xs text-charcoal-soft">Loading documents…</div>
    );
  }

  if (docs.length === 0) return null;

  const sorted = [...docs].sort(
    (a, b) =>
      (DOC_STATUS_SORT[a.computed_status] ?? 99) -
      (DOC_STATUS_SORT[b.computed_status] ?? 99),
  );

  return (
    <div className="mt-6">
      <div className="flex items-baseline justify-between">
        <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft">
          Documents
        </div>
        <div className="text-[10px] text-charcoal-soft/70">
          {docs.length} on file
        </div>
      </div>

      <ul className="mt-3 space-y-0">
        {sorted.map((doc) => (
          <li
            key={doc.node_document_upid}
            className="border-t border-cream-shadow py-3 first:border-t-0 first:pt-0"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-charcoal leading-tight">
                  {docTypeLabel(doc.document_type)}
                </div>
                {doc.issuing_body ? (
                  <div className="mt-0.5 text-[11px] text-charcoal-soft leading-tight">
                    {doc.issuing_body}
                  </div>
                ) : null}
              </div>
              <span
                className={
                  "inline-block px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap mt-0.5 " +
                  docStatusPillClasses(doc.computed_status)
                }
              >
                {docStatusLabel(doc.computed_status, doc.days_until_expiry)}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-3 text-[10px] text-charcoal-soft/60 italic">
        Illustrative documents — metadata only, no files attached.
      </div>
    </div>
  );
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
            {statusLabel(st)}
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

      <DocumentsSection entityUpid={entity.data.upid} />
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
