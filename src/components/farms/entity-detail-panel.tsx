"use client";

import { useEffect, useState } from "react";
import { Lock, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { NetworkEntity, ComplianceInfo } from "./network-explorer";
import { LiteracyHook } from "@/components/ui/literacy-hook";

export function prettify(raw: string | null | undefined): string {
  if (!raw) return "—";
  return raw.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
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

// Row labels that are always treated as premium in embed mode — regardless
// of any contact_visibility setting on the entity. These are business fields
// (capacity, internal priority ranking, financials) that the Layer 1 public
// tier doesn't get. Contact-gated labels below handle the additional case
// where an entity with a contact_visibility column is set above 'public'.
const ALWAYS_PREMIUM_LABELS: Record<NetworkEntity["kind"], Set<string>> = {
  farm: new Set(["Acres", "Priority tier"]),
  market: new Set(["Priority tier"]),
  distributor: new Set(["Priority tier"]),
  processor: new Set(["Capacity", "Shared space", "Priority tier"]),
  recovery_node: new Set<string>(),
  enabler: new Set<string>(),
};

const CONTACT_GATED_LABELS: {
  recovery_node: Set<string>;
  enabler: Set<string>;
} = {
  recovery_node: new Set(["Capacity", "Cold storage", "Freezer"]),
  enabler: new Set(["Staff", "Annual budget"]),
};

function isRowPremium(
  entity: NetworkEntity,
  label: string,
  embedMode: boolean,
): boolean {
  if (!embedMode) return false;
  if (ALWAYS_PREMIUM_LABELS[entity.kind].has(label)) return true;
  // Farm revenue row labels include a year — "Revenue (2024)" etc.
  if (entity.kind === "farm" && label.startsWith("Revenue")) return true;
  if (entity.kind === "recovery_node" || entity.kind === "enabler") {
    const vis = entity.data.contact_visibility;
    if (vis && vis !== "public") {
      return CONTACT_GATED_LABELS[entity.kind].has(label);
    }
  }
  return false;
}

export function statusPillClasses(status: string | null | undefined): string {
  if (status === "enrolled") return "bg-forest-sage text-warm-cream";
  if (status === "engaged") return "bg-accent-amber text-warm-cream";
  if (status === "prospect") return "bg-slate-blue-light text-warm-cream";
  if (status === "afs_active") return "bg-slate-blue-light text-warm-charcoal";
  return "bg-slate-pale text-charcoal";
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
      return "bg-forest-sage/10 text-forest-sage";
    case "expiring_soon":
      return "bg-accent-amber/15 text-accent-amber";
    case "expired":
      return "bg-mid-gray/25 text-mid-gray";
    case "superseded":
      return "bg-charcoal-soft/15 text-charcoal-soft";
    default:
      return "bg-slate-pale text-charcoal-soft";
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

// -----------------------------------------------------------------------
// Practices section — surfaces the regen-claim / Scope-3 / risk-flag facts
// on farms, and the diversion metrics on recovery nodes. Mirrors the
// Documents section's visual language (header bar + rows + literacy hook)
// so the panel reads as a consistent stack of evidence blocks.
// -----------------------------------------------------------------------

const CLAIM_PILL_LABEL: Record<string, string> = {
  third_party_roc: "ROC certified",
  third_party_eov: "EOV certified",
  third_party_leaf: "LEAF certified",
  third_party_regenified: "Regenified",
  third_party_biodynamic: "Biodynamic",
  transitional: "In transition",
  pending_verification: "Audit pending",
  self_reported: "Self-reported",
  none_claimed: "No regen claim",
};

function claimPillClasses(claim: string): string {
  if (claim.startsWith("third_party")) return "bg-forest-sage/15 text-forest-sage";
  if (claim === "transitional") return "bg-slate-blue-light/25 text-slate-blue";
  if (claim === "pending_verification") return "bg-accent-amber/15 text-accent-amber";
  if (claim === "self_reported") return "bg-accent-amber/20 text-charcoal";
  return "bg-slate-pale text-charcoal-soft";
}

const PLATFORM_SHORT: Record<string, string> = {
  comet_farm: "COMET-Farm",
  fieldprint: "Fieldprint",
  cool_farm_tool: "Cool Farm Tool",
  conservis: "Conservis",
  scope3_net_zero: "Scope3 NetZero",
  cargill_regenconnect: "Cargill RegenConnect",
  proprietary: "Proprietary",
};

function FarmPracticesBlock({
  entity,
}: {
  entity: Extract<NetworkEntity, { kind: "farm" }>;
}) {
  const f = entity.data;
  const claim = f.regenerative_claim_verified;
  const platform = f.scope3_platform;
  const flags = f.claim_risk_flags ?? [];

  // Nothing set yet — skip the block entirely.
  if (!claim && !platform && flags.length === 0) return null;

  return (
    <div className="mt-6">
      <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft">
        Practices
      </div>

      {claim ? (
        <div className="mt-3">
          <span
            className={
              "inline-block px-2.5 py-1 rounded-full text-[11px] font-medium " +
              claimPillClasses(claim)
            }
          >
            {CLAIM_PILL_LABEL[claim] ?? prettify(claim)}
          </span>
        </div>
      ) : null}

      <dl className="mt-3 space-y-0">
        {platform && platform !== "none" ? (
          <div className="flex justify-between gap-4 border-t border-cream-shadow py-3 first:border-t-0 first:pt-0 text-sm">
            <dt className="text-charcoal-soft">Scope-3 platform</dt>
            <dd className="m-0 text-charcoal font-semibold text-right">
              {PLATFORM_SHORT[platform] ?? prettify(platform)}
            </dd>
          </div>
        ) : null}
      </dl>

      {flags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {flags.map((fl) => (
            <span
              key={fl}
              className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent-amber/15 text-accent-amber"
              title={prettify(fl)}
            >
              {prettify(fl)}
            </span>
          ))}
        </div>
      ) : null}

      <LiteracyHook
        topic="regenerative"
        label="What do these labels mean?"
      />
    </div>
  );
}

function RecoveryDiversionBlock({
  entity,
}: {
  entity: Extract<NetworkEntity, { kind: "recovery_node" }>;
}) {
  const r = entity.data;
  const attrs = (r.attributes ?? {}) as Record<string, unknown>;
  const lbs = Number(attrs.lbs_diverted_annual);
  const meals = Number(attrs.meals_equivalent_annual);
  const cat = attrs.diversion_category as string | undefined;
  const note = attrs.diversion_source_note as string | undefined;

  if (!Number.isFinite(lbs) || lbs <= 0) return null;

  const catLabel = cat
    ? cat
        .replace(/^to_/, "")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
    : "—";

  return (
    <div className="mt-6">
      <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft">
        Diversion
      </div>

      <dl className="mt-3 space-y-0">
        <div className="flex justify-between gap-4 border-t border-cream-shadow py-3 first:border-t-0 first:pt-0 text-sm">
          <dt className="text-charcoal-soft">Est. lbs diverted / yr</dt>
          <dd className="m-0 text-charcoal font-semibold text-right tabular-nums">
            {Math.round(lbs).toLocaleString()}
          </dd>
        </div>
        {Number.isFinite(meals) && meals > 0 ? (
          <div className="flex justify-between gap-4 border-t border-cream-shadow py-3 text-sm">
            <dt className="text-charcoal-soft">Meals-equivalent / yr</dt>
            <dd className="m-0 text-charcoal font-semibold text-right tabular-nums">
              {Math.round(meals).toLocaleString()}
            </dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-4 border-t border-cream-shadow py-3 text-sm">
          <dt className="text-charcoal-soft">Diversion becomes</dt>
          <dd className="m-0 text-charcoal font-semibold text-right">
            {catLabel}
          </dd>
        </div>
      </dl>

      {note ? (
        <div className="mt-3 text-[10px] text-charcoal-soft/70 italic leading-relaxed">
          {note}
        </div>
      ) : null}

      <LiteracyHook
        topic="recovery"
        label="What counts as food recovery?"
      />
    </div>
  );
}

function PracticesSection({ entity }: { entity: NetworkEntity }) {
  if (entity.kind === "farm") return <FarmPracticesBlock entity={entity} />;
  if (entity.kind === "recovery_node")
    return <RecoveryDiversionBlock entity={entity} />;
  return null;
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
      <div className="mt-6 text-xs text-accent-amber">
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

function LockedFieldModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-charcoal/30 px-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-[14px] border border-cream-shadow bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-cream-deep text-charcoal-soft transition-colors hover:bg-cream-shadow"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="mb-3 inline-flex items-center gap-2 text-charcoal-soft">
          <Lock className="h-3.5 w-3.5" />
          <span className="text-[11px] font-medium uppercase tracking-[0.1em]">
            Subscriber field
          </span>
        </div>

        <p className="font-display mb-5 text-[18px] leading-[1.4] text-charcoal">
          This data is available for your region. Let&apos;s talk about what
          yours looks like.
        </p>

        <a
          href="mailto:hello@afarmersshare.com?subject=Inquiry%20from%20Provender%20demo"
          className="inline-flex items-center gap-2 rounded-full bg-slate-blue px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-warm-cream transition-colors hover:bg-slate-blue-light"
        >
          hello@afarmersshare.com
        </a>
      </div>
    </div>
  );
}

function ComplianceRow({ info }: { info: ComplianceInfo }) {
  const valueColor =
    info.status === "buyer_ready"
      ? "text-forest-sage"
      : info.status === "close"
        ? "text-accent-amber"
        : "text-accent-amber";
  const valueText =
    info.status === "buyer_ready"
      ? "Buyer-ready"
      : info.missing.length === 1
        ? `1 gap · ${info.missing[0].toLowerCase()}`
        : `${info.missing.length} gaps · ${info.missing
            .map((m) => m.toLowerCase())
            .join(", ")}`;
  return (
    <div className="flex justify-between gap-4 border-t border-cream-shadow py-3 first:border-t-0 first:pt-0 text-sm">
      <dt className="text-charcoal-soft">Compliance</dt>
      <dd className={`m-0 text-right font-semibold ${valueColor}`}>
        {valueText}
      </dd>
    </div>
  );
}

function Body({
  entity,
  entityCount,
  hintToClick,
  embedMode = false,
  complianceByFarm,
}: {
  entity: NetworkEntity | null;
  entityCount: number;
  hintToClick: string;
  embedMode?: boolean;
  complianceByFarm?: Map<string, ComplianceInfo>;
}) {
  const [lockedModalOpen, setLockedModalOpen] = useState(false);

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

  // In embed mode, suppress the address subhead for market/distributor/processor
  // — address is a direct contact pathway that the public tier doesn't get.
  const rawSub = subhead(entity);
  const suppressAddressSub =
    embedMode &&
    (entity.kind === "market" ||
      entity.kind === "distributor" ||
      entity.kind === "processor");
  const sub = suppressAddressSub ? null : rawSub;

  const st = status(entity);
  const rows = detailRows(entity);

  return (
    <>
      <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft mb-3">
        {KIND_LABEL[entity.kind]}
      </div>

      <div className="font-display text-[24px] font-semibold text-slate-blue leading-[1.2] tracking-[-0.015em]">
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
        {entity.kind === "farm" && complianceByFarm?.get(entity.data.upid) ? (
          <ComplianceRow info={complianceByFarm.get(entity.data.upid)!} />
        ) : null}
        {rows.map(([label, value]) => {
          const locked = isRowPremium(entity, label, embedMode);
          return (
            <div
              key={label}
              className="flex justify-between gap-4 border-t border-cream-shadow py-3 first:border-t-0 first:pt-0 text-sm"
            >
              <dt className="text-charcoal-soft">{label}</dt>
              <dd className="m-0 text-right">
                {locked ? (
                  <button
                    type="button"
                    onClick={() => setLockedModalOpen(true)}
                    className="group relative inline-flex items-center gap-1.5 text-charcoal-soft/70 transition-colors hover:text-charcoal cursor-pointer"
                    aria-label="This data is available for your region — tap to contact us"
                  >
                    <Lock className="w-3 h-3" />
                    <span className="text-[11px] uppercase tracking-[0.06em] font-medium">
                      Subscribers
                    </span>
                    <span className="pointer-events-none absolute -top-8 right-0 z-20 hidden whitespace-nowrap rounded bg-charcoal px-2 py-1 text-[10px] font-normal normal-case tracking-normal text-cream shadow group-hover:block">
                      This data is available for your region
                    </span>
                  </button>
                ) : (
                  <span className="text-charcoal font-semibold">{value}</span>
                )}
              </dd>
            </div>
          );
        })}
      </dl>

      <PracticesSection entity={entity} />
      <DocumentsSection entityUpid={entity.data.upid} />

      <LockedFieldModal
        open={lockedModalOpen}
        onClose={() => setLockedModalOpen(false)}
      />
    </>
  );
}

export function EntityDetailPanel({
  entity,
  entityCount,
  hintToClick = "Click any marker on the map to see details.",
  embedMode = false,
  complianceByFarm,
}: {
  entity: NetworkEntity | null;
  entityCount: number;
  hintToClick?: string;
  embedMode?: boolean;
  complianceByFarm?: Map<string, ComplianceInfo>;
}) {
  return (
    <div className="rounded-[14px] border border-cream-shadow bg-white p-6 h-[600px] overflow-y-auto flex flex-col">
      <Body
        entity={entity}
        entityCount={entityCount}
        hintToClick={hintToClick}
        embedMode={embedMode}
        complianceByFarm={complianceByFarm}
      />
    </div>
  );
}

export function EntityDetailOverlay({
  entity,
  entityCount,
  onClose,
  embedMode = false,
  complianceByFarm,
}: {
  entity: NetworkEntity | null;
  entityCount: number;
  onClose: () => void;
  embedMode?: boolean;
  complianceByFarm?: Map<string, ComplianceInfo>;
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
        <Body
          entity={entity}
          entityCount={entityCount}
          hintToClick=""
          embedMode={embedMode}
          complianceByFarm={complianceByFarm}
        />
      </div>
    </div>
  );
}
