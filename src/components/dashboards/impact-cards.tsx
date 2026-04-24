"use client";

import { useMemo } from "react";
import type {
  Farm,
  FarmCrop,
  RecoveryNode,
  ImpactDoc,
} from "../farms/network-explorer";
import { LiteracyHook } from "@/components/ui/literacy-hook";

// Impact card row shown across every persona dashboard.
//
// Per the 2026-04-23 Impact/MMRV memo, every card is a verification /
// literacy tool: it surfaces an evaluative number and explicitly invites
// the viewer to interrogate what the word means. The stat doesn't stand
// alone — each card pairs it with a categorical breakdown so the viewer
// sees the spread inside the label (e.g. "regenerative" covers everything
// from unverified self-reports to third-party Biodynamic certification).
//
// Four cards: Regenerative footprint · Measurement & verification ·
// Food recovery & circular flow · Economic sovereignty.
//
// Data inputs are scoped by the caller — dashboards decide whether
// "scope" means this county, a 25-mile ring, or the whole metro.
// The card headings reference the scopeLabel prop.

type Props = {
  farms: Farm[];
  farmCrops: FarmCrop[];
  recoveryNodes: RecoveryNode[];
  impactDocs: ImpactDoc[];
  scopeLabel: string; // e.g. "in this county" or "within 25 mi"
};

// Production methods that count toward the regenerative / organic
// footprint on Card 1. Source: lookup_type='production_method' (Step 6).
const REGENERATIVE_METHODS = new Set([
  "certified_organic",
  "transitional_organic",
  "certified_regenerative",
  "beyond_organic",
  "pasture_raised",
]);

// Farm-level regen claim buckets → display group for Card 1 stratification.
const CLAIM_GROUP: Record<string, "certified" | "transitional" | "pending" | "self_reported" | "none"> = {
  third_party_roc: "certified",
  third_party_eov: "certified",
  third_party_leaf: "certified",
  third_party_regenified: "certified",
  third_party_biodynamic: "certified",
  transitional: "transitional",
  pending_verification: "pending",
  self_reported: "self_reported",
  none_claimed: "none",
};

const CLAIM_LABEL: Record<string, string> = {
  third_party_roc: "Regenerative Organic Certified (ROC)",
  third_party_eov: "Ecological Outcome Verification (EOV)",
  third_party_leaf: "LEAF Marque",
  third_party_regenified: "Regenified",
  third_party_biodynamic: "Demeter Biodynamic",
  transitional: "In transition",
  pending_verification: "Audit pending",
  self_reported: "Self-reported",
  none_claimed: "No claim",
};

const PLATFORM_LABEL: Record<string, string> = {
  comet_farm: "USDA COMET-Farm",
  fieldprint: "Field to Market Fieldprint",
  cool_farm_tool: "Cool Farm Tool",
  conservis: "Conservis",
  scope3_net_zero: "Scope3 NetZero",
  cargill_regenconnect: "Cargill RegenConnect",
  proprietary: "Buyer-proprietary",
};

function fmtInt(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString();
}

function fmtPct(n: number | null | undefined, digits = 0): string {
  if (n == null) return "—";
  return `${(n * 100).toFixed(digits)}%`;
}

function fmtMoney(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function ImpactCards({
  farms,
  farmCrops,
  recoveryNodes,
  impactDocs,
  scopeLabel,
}: Props) {
  // ---------- Card 1: Regenerative footprint ----------
  const regen = useMemo(() => {
    const farmUpids = new Set(farms.map((f) => f.upid));
    const scopedCrops = farmCrops.filter((c) => farmUpids.has(c.farm_upid));
    let totalAcres = 0;
    let regenAcres = 0;
    for (const c of scopedCrops) {
      const a = c.acres ?? 0;
      totalAcres += a;
      if (c.production_method && REGENERATIVE_METHODS.has(c.production_method)) {
        regenAcres += a;
      }
    }
    const groups: Record<
      "certified" | "transitional" | "pending" | "self_reported" | "none",
      number
    > = {
      certified: 0,
      transitional: 0,
      pending: 0,
      self_reported: 0,
      none: 0,
    };
    const claimDetail = new Map<string, number>();
    for (const f of farms) {
      const claim = f.regenerative_claim_verified ?? "none_claimed";
      const g = CLAIM_GROUP[claim] ?? "none";
      groups[g] += 1;
      claimDetail.set(claim, (claimDetail.get(claim) ?? 0) + 1);
    }
    return {
      totalAcres,
      regenAcres,
      regenPct: totalAcres > 0 ? regenAcres / totalAcres : null,
      groups,
      farmCount: farms.length,
      claimDetail: Array.from(claimDetail.entries())
        .filter(([, n]) => n > 0)
        .sort((a, b) => b[1] - a[1]),
    };
  }, [farms, farmCrops]);

  // ---------- Card 2: Measurement & verification ----------
  const measure = useMemo(() => {
    const farmUpids = new Set(farms.map((f) => f.upid));
    const scopedDocs = impactDocs.filter((d) => farmUpids.has(d.node_upid));
    const docCount = new Map<string, number>();
    const farmsWithDocType = new Map<string, Set<string>>();
    for (const d of scopedDocs) {
      docCount.set(d.document_type, (docCount.get(d.document_type) ?? 0) + 1);
      if (!farmsWithDocType.has(d.document_type)) {
        farmsWithDocType.set(d.document_type, new Set());
      }
      farmsWithDocType.get(d.document_type)!.add(d.node_upid);
    }
    let farmsOnPlatform = 0;
    const platformDetail = new Map<string, number>();
    let risk_regen = 0;
    let risk_scope3 = 0;
    for (const f of farms) {
      const plat = f.scope3_platform;
      if (plat && plat !== "none") {
        farmsOnPlatform += 1;
        platformDetail.set(plat, (platformDetail.get(plat) ?? 0) + 1);
      }
      for (const flag of f.claim_risk_flags ?? []) {
        if (flag === "regenerative_unverified") risk_regen += 1;
        if (flag === "scope3_unverified") risk_scope3 += 1;
      }
    }
    return {
      farmsOnPlatform,
      platformDetail: Array.from(platformDetail.entries())
        .filter(([, n]) => n > 0)
        .sort((a, b) => b[1] - a[1]),
      soilTestFarms: farmsWithDocType.get("soil_test")?.size ?? 0,
      coverCropPlanFarms: farmsWithDocType.get("cover_crop_plan")?.size ?? 0,
      conservationPlanFarms:
        farmsWithDocType.get("nrcs_conservation_practice_plan")?.size ?? 0,
      organicCertFarms:
        (farmsWithDocType.get("organic_cert")?.size ?? 0) +
        (farmsWithDocType.get("real_organic_cert")?.size ?? 0),
      gapCertFarms: farmsWithDocType.get("gap_cert")?.size ?? 0,
      grantAwardFarms: farmsWithDocType.get("usda_grant_award")?.size ?? 0,
      risk_regen,
      risk_scope3,
      farmCount: farms.length,
    };
  }, [farms, impactDocs]);

  // ---------- Card 3: Food recovery & circular flow ----------
  const recovery = useMemo(() => {
    const byCategory: Record<string, { nodes: number; lbs: number; meals: number }> = {
      to_human_consumption: { nodes: 0, lbs: 0, meals: 0 },
      to_soil_amendment: { nodes: 0, lbs: 0, meals: 0 },
      to_energy_and_digestate: { nodes: 0, lbs: 0, meals: 0 },
      unknown: { nodes: 0, lbs: 0, meals: 0 },
    };
    let totalLbs = 0;
    let totalMeals = 0;
    for (const rn of recoveryNodes) {
      const a = (rn.attributes ?? {}) as Record<string, unknown>;
      const cat = (a.diversion_category as string | undefined) ?? "unknown";
      const lbs = Number(a.lbs_diverted_annual) || 0;
      const meals = Number(a.meals_equivalent_annual) || 0;
      if (!(cat in byCategory)) byCategory[cat] = { nodes: 0, lbs: 0, meals: 0 };
      byCategory[cat].nodes += 1;
      byCategory[cat].lbs += lbs;
      byCategory[cat].meals += meals;
      totalLbs += lbs;
      totalMeals += meals;
    }
    const typeBreakdown = new Map<string, number>();
    for (const rn of recoveryNodes) {
      const t = rn.recovery_node_type ?? "unknown";
      typeBreakdown.set(t, (typeBreakdown.get(t) ?? 0) + 1);
    }
    return {
      totalLbs,
      totalMeals,
      byCategory,
      nodeCount: recoveryNodes.length,
      typeBreakdown: Array.from(typeBreakdown.entries()).sort(
        (a, b) => b[1] - a[1],
      ),
    };
  }, [recoveryNodes]);

  // ---------- Card 4: Economic sovereignty ----------
  const econ = useMemo(() => {
    const enrolled = farms.filter((f) => f.afs_member_status === "enrolled");
    const withBaseline = farms.filter(
      (f) => typeof f.gross_revenue_baseline === "number",
    );
    let revTotal = 0;
    for (const f of withBaseline) {
      revTotal += f.gross_revenue_baseline ?? 0;
    }
    const avgRevenue =
      withBaseline.length > 0 ? revTotal / withBaseline.length : null;
    let directCount = 0;
    let midstreamCount = 0;
    for (const f of farms) {
      const attrs = (f.attributes ?? {}) as Record<string, unknown>;
      const chan =
        (attrs.primary_market_channel as string | undefined) ??
        (attrs.primary_market_channel_pre as string | undefined) ??
        null;
      if (chan == null) continue;
      // Direct-to-buyer channels per lookup_type='primary_market_channel'.
      if (
        chan === "direct_to_consumer" ||
        chan === "farmers_market" ||
        chan === "csa" ||
        chan === "on_farm_stand" ||
        chan === "direct_to_institution" ||
        chan === "direct_to_restaurant"
      ) {
        directCount += 1;
      } else {
        midstreamCount += 1;
      }
    }
    const directPct =
      directCount + midstreamCount > 0
        ? directCount / (directCount + midstreamCount)
        : null;
    // Average years in AFS relationship — anchor on afs_enrollment_date if
    // present on attributes, else fall back to "—".
    const now = Date.now();
    let yrsSum = 0;
    let yrsN = 0;
    for (const f of enrolled) {
      const attrs = (f.attributes ?? {}) as Record<string, unknown>;
      const iso = attrs.afs_enrollment_date as string | undefined;
      if (!iso) continue;
      const t = Date.parse(iso);
      if (Number.isFinite(t)) {
        yrsSum += (now - t) / (365.25 * 24 * 3600 * 1000);
        yrsN += 1;
      }
    }
    return {
      enrolledCount: enrolled.length,
      avgRevenue,
      directPct,
      directCount,
      midstreamCount,
      avgYears: yrsN > 0 ? yrsSum / yrsN : null,
      farmCount: farms.length,
    };
  }, [farms]);

  const anyData =
    regen.farmCount > 0 ||
    measure.farmCount > 0 ||
    recovery.nodeCount > 0;

  if (!anyData) {
    return (
      <section className="rounded-[14px] border border-cream-shadow bg-white p-6 sm:p-8 shadow-sm">
        <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft mb-2">
          Impact — {scopeLabel}
        </div>
        <div className="text-sm text-charcoal-soft italic">
          Nothing in scope yet. Pick a different filter to see impact signal.
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[14px] border border-cream-shadow bg-white p-6 sm:p-8 shadow-sm">
      <div className="mb-6 flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft mb-1">
            Impact — {scopeLabel}
          </div>
          <div className="font-display text-[20px] font-semibold text-slate-blue leading-tight">
            What good is this food system doing?
          </div>
          <div className="mt-1 text-[12px] text-charcoal-soft leading-relaxed max-w-prose">
            Every label below covers a spectrum. Click &ldquo;What does this
            mean?&rdquo; on any card to see what the word rests on — and what
            it doesn&rsquo;t.
          </div>
        </div>
        <span className="inline-block text-[10px] text-charcoal-soft/70 italic border border-cream-shadow rounded-full px-2.5 py-1">
          Demo values — some figures are synthesized
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* =========================================================
            Card 1 — Regenerative footprint
            ========================================================= */}
        <div className="rounded-[10px] border-l-4 border-l-forest-sage border border-cream-shadow bg-cream/40 p-5">
          <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-forest-sage mb-2">
            Regenerative footprint
          </div>
          <div className="font-display text-[22px] font-semibold text-charcoal leading-tight">
            {fmtInt(Math.round(regen.regenAcres))} ac
          </div>
          <div className="mt-0.5 text-[12px] text-charcoal-soft">
            under regenerative or organic practice
            {regen.regenPct != null
              ? ` (${fmtPct(regen.regenPct)} of ${fmtInt(
                  Math.round(regen.totalAcres),
                )} planted ac)`
              : null}
          </div>

          <div className="mt-4 pt-4 border-t border-cream-shadow space-y-1.5">
            <ClaimRow
              label="Third-party certified"
              count={regen.groups.certified}
              total={regen.farmCount}
              dotClass="bg-forest-sage"
            />
            <ClaimRow
              label="In transition"
              count={regen.groups.transitional}
              total={regen.farmCount}
              dotClass="bg-slate-blue-light"
            />
            <ClaimRow
              label="Audit pending"
              count={regen.groups.pending}
              total={regen.farmCount}
              dotClass="bg-accent-amber"
            />
            <ClaimRow
              label="Self-reported"
              count={regen.groups.self_reported}
              total={regen.farmCount}
              dotClass="bg-slate-mid"
            />
            <ClaimRow
              label="No regen claim"
              count={regen.groups.none}
              total={regen.farmCount}
              dotClass="bg-rule"
            />
          </div>

          {regen.claimDetail.length > 0 ? (
            <details className="mt-3 group">
              <summary className="cursor-pointer list-none text-[11px] text-charcoal-soft hover:text-slate-blue">
                <span className="inline-block transition-transform group-open:rotate-90">
                  ▸
                </span>{" "}
                Certification detail
              </summary>
              <ul className="mt-2 space-y-0.5 text-[11px] text-charcoal-soft pl-4">
                {regen.claimDetail.map(([claim, n]) => (
                  <li key={claim} className="flex justify-between">
                    <span>{CLAIM_LABEL[claim] ?? claim}</span>
                    <span className="tabular-nums font-mono">
                      {n} {n === 1 ? "farm" : "farms"}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          <LiteracyHook
            topic="regenerative"
            label="What counts as regenerative?"
          />
        </div>

        {/* =========================================================
            Card 2 — Measurement & verification
            ========================================================= */}
        <div className="rounded-[10px] border-l-4 border-l-slate-blue border border-cream-shadow bg-cream/40 p-5">
          <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-blue mb-2">
            Measurement &amp; verification
          </div>
          <div className="font-display text-[22px] font-semibold text-charcoal leading-tight">
            {fmtInt(measure.farmsOnPlatform)} / {fmtInt(measure.farmCount)}
          </div>
          <div className="mt-0.5 text-[12px] text-charcoal-soft">
            farms registered with a Scope-3 measurement platform
          </div>

          <div className="mt-4 pt-4 border-t border-cream-shadow space-y-1.5">
            <EvidenceRow
              label="Soil tests on file"
              count={measure.soilTestFarms}
            />
            <EvidenceRow
              label="Conservation plans (NRCS)"
              count={measure.conservationPlanFarms}
            />
            <EvidenceRow
              label="Cover-crop plans"
              count={measure.coverCropPlanFarms}
            />
            <EvidenceRow
              label="Organic certificates"
              count={measure.organicCertFarms}
            />
            <EvidenceRow
              label="GAP audits"
              count={measure.gapCertFarms}
            />
            <EvidenceRow
              label="USDA grants awarded"
              count={measure.grantAwardFarms}
            />
          </div>

          {measure.risk_regen > 0 || measure.risk_scope3 > 0 ? (
            <div className="mt-3 text-[11px] text-mid-gray leading-relaxed">
              {measure.risk_regen > 0 ? (
                <div>
                  <b>{measure.risk_regen}</b> regen claim
                  {measure.risk_regen === 1 ? "" : "s"} without third-party
                  audit.
                </div>
              ) : null}
              {measure.risk_scope3 > 0 ? (
                <div>
                  <b>{measure.risk_scope3}</b> Scope-3 platform registration
                  {measure.risk_scope3 === 1 ? "" : "s"} not yet audited.
                </div>
              ) : null}
            </div>
          ) : null}

          {measure.platformDetail.length > 0 ? (
            <details className="mt-3 group">
              <summary className="cursor-pointer list-none text-[11px] text-charcoal-soft hover:text-slate-blue">
                <span className="inline-block transition-transform group-open:rotate-90">
                  ▸
                </span>{" "}
                Platforms in use
              </summary>
              <ul className="mt-2 space-y-0.5 text-[11px] text-charcoal-soft pl-4">
                {measure.platformDetail.map(([p, n]) => (
                  <li key={p} className="flex justify-between">
                    <span>{PLATFORM_LABEL[p] ?? p}</span>
                    <span className="tabular-nums font-mono">
                      {n} {n === 1 ? "farm" : "farms"}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          <LiteracyHook
            topic="measurement"
            label="What counts as evidence?"
          />
        </div>

        {/* =========================================================
            Card 3 — Food recovery & circular flow
            ========================================================= */}
        <div className="rounded-[10px] border-l-4 border-l-accent-amber border border-cream-shadow bg-cream/40 p-5">
          <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-accent-amber mb-2">
            Food recovery &amp; circular flow
          </div>
          <div className="font-display text-[22px] font-semibold text-charcoal leading-tight">
            {recovery.totalLbs > 0
              ? `${(recovery.totalLbs / 1_000_000).toFixed(1)}M lbs`
              : "—"}
          </div>
          <div className="mt-0.5 text-[12px] text-charcoal-soft">
            estimated diversion per year across {recovery.nodeCount}{" "}
            {recovery.nodeCount === 1 ? "node" : "nodes"}
          </div>

          <div className="mt-4 pt-4 border-t border-cream-shadow space-y-1.5">
            <CategoryRow
              label="To plates"
              lbs={recovery.byCategory.to_human_consumption.lbs}
              meals={recovery.byCategory.to_human_consumption.meals}
              nodes={recovery.byCategory.to_human_consumption.nodes}
              dotClass="bg-forest-sage"
            />
            <CategoryRow
              label="To soil"
              lbs={recovery.byCategory.to_soil_amendment.lbs}
              nodes={recovery.byCategory.to_soil_amendment.nodes}
              dotClass="bg-accent-amber"
            />
            <CategoryRow
              label="To energy"
              lbs={recovery.byCategory.to_energy_and_digestate.lbs}
              nodes={recovery.byCategory.to_energy_and_digestate.nodes}
              dotClass="bg-mid-gray"
            />
          </div>

          {recovery.byCategory.to_human_consumption.meals > 0 ? (
            <div className="mt-3 text-[11px] text-charcoal-soft leading-relaxed">
              Est.{" "}
              <b className="text-charcoal">
                {fmtInt(recovery.byCategory.to_human_consumption.meals)}
              </b>{" "}
              meals-equivalent (Feeding America 1.2 lbs/meal).
            </div>
          ) : null}

          {recovery.typeBreakdown.length > 0 ? (
            <details className="mt-3 group">
              <summary className="cursor-pointer list-none text-[11px] text-charcoal-soft hover:text-slate-blue">
                <span className="inline-block transition-transform group-open:rotate-90">
                  ▸
                </span>{" "}
                Node type detail
              </summary>
              <ul className="mt-2 space-y-0.5 text-[11px] text-charcoal-soft pl-4">
                {recovery.typeBreakdown.map(([t, n]) => (
                  <li key={t} className="flex justify-between">
                    <span>
                      {t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </span>
                    <span className="tabular-nums font-mono">
                      {n} {n === 1 ? "node" : "nodes"}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          <LiteracyHook
            topic="recovery"
            label="&lsquo;Recovered&rsquo; doesn&rsquo;t mean one thing."
          />
        </div>

        {/* =========================================================
            Card 4 — Economic sovereignty
            ========================================================= */}
        <div className="rounded-[10px] border-l-4 border-l-slate-blue-light border border-cream-shadow bg-cream/40 p-5">
          <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-blue-light mb-2">
            Economic sovereignty
          </div>
          <div className="font-display text-[22px] font-semibold text-charcoal leading-tight">
            {econ.directPct != null ? fmtPct(econ.directPct) : "—"}
          </div>
          <div className="mt-0.5 text-[12px] text-charcoal-soft">
            of farms selling direct to buyer (no middleman)
          </div>

          <div className="mt-4 pt-4 border-t border-cream-shadow space-y-1.5">
            <EvidenceRow
              label="Enrolled with AFS"
              count={econ.enrolledCount}
            />
            {econ.avgRevenue != null ? (
              <div className="flex items-baseline justify-between text-[12px]">
                <span className="text-charcoal-soft">
                  Avg baseline revenue
                </span>
                <span className="text-charcoal font-semibold tabular-nums">
                  {fmtMoney(econ.avgRevenue)}
                </span>
              </div>
            ) : null}
            {econ.avgYears != null ? (
              <div className="flex items-baseline justify-between text-[12px]">
                <span className="text-charcoal-soft">
                  Avg years with AFS
                </span>
                <span className="text-charcoal font-semibold tabular-nums">
                  {econ.avgYears.toFixed(1)} yr
                </span>
              </div>
            ) : null}
            <div className="flex items-baseline justify-between text-[12px]">
              <span className="text-charcoal-soft">
                Direct-channel farms
              </span>
              <span className="text-charcoal font-semibold tabular-nums">
                {econ.directCount}
              </span>
            </div>
            <div className="flex items-baseline justify-between text-[12px]">
              <span className="text-charcoal-soft">
                Middleman-channel farms
              </span>
              <span className="text-charcoal font-semibold tabular-nums">
                {econ.midstreamCount}
              </span>
            </div>
          </div>

          <LiteracyHook
            topic="local"
            label="What makes food &lsquo;local&rsquo;?"
          />
        </div>
      </div>

      <ImpactTrends />
    </section>
  );
}

// Quarter-over-quarter trend strip. Illustrative values synthesized for the
// demo — investors want to see whether each impact metric is moving the right
// direction over time, not just a snapshot. Once the real data pipeline has
// quarterly snapshots, swap these constants for a props-driven version.
const TREND_DATA: Array<{
  label: string;
  quarters: [number, number, number, number];
  delta: string;
  accent: string;
}> = [
  {
    label: "Regenerative footprint",
    quarters: [48, 58, 68, 78],
    delta: "+24%",
    accent: "bg-forest-sage",
  },
  {
    label: "Measurement & verification",
    quarters: [32, 42, 50, 62],
    delta: "+18%",
    accent: "bg-slate-blue",
  },
  {
    label: "Food recovery & circular flow",
    quarters: [40, 50, 58, 68],
    delta: "+14%",
    accent: "bg-accent-amber",
  },
  {
    label: "Economic sovereignty",
    quarters: [28, 34, 44, 56],
    delta: "+22%",
    accent: "bg-slate-blue-light",
  },
];

function ImpactTrends() {
  return (
    <div className="mt-8 rounded-[10px] border border-cream-shadow bg-cream/30 p-5">
      <div className="mb-4 flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft mb-0.5">
            Quarter-over-quarter trend
          </div>
          <div className="text-[12px] text-charcoal-soft leading-relaxed">
            Each impact metric, last four quarters. Snapshot data alone
            doesn&rsquo;t tell the growth story.
          </div>
        </div>
        <span className="inline-block text-[10px] text-charcoal-soft/70 italic border border-cream-shadow rounded-full px-2.5 py-1">
          Illustrative — synthesized trend
        </span>
      </div>

      <div className="space-y-3">
        {TREND_DATA.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[1fr_auto_auto] items-center gap-4"
          >
            <span className="text-[12px] text-charcoal font-medium">
              {row.label}
            </span>
            <div className="flex items-end gap-1 h-8" title={`Q1→Q4 trend for ${row.label}`}>
              {row.quarters.map((v, i) => (
                <div
                  key={i}
                  className={`${row.accent} rounded-sm w-3`}
                  style={{ height: `${v}%` }}
                  aria-label={`Quarter ${i + 1}`}
                />
              ))}
            </div>
            <span className="text-[12px] font-semibold tabular-nums text-slate-blue min-w-[52px] text-right">
              {row.delta}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 text-[10px] text-charcoal-soft/60 italic">
        Each row shows quarters 1 through 4, left to right.
      </div>
    </div>
  );
}

function ClaimRow({
  label,
  count,
  total,
  dotClass,
}: {
  label: string;
  count: number;
  total: number;
  dotClass: string;
}) {
  const pct = total > 0 ? count / total : 0;
  return (
    <div className="flex items-center gap-2">
      <span className={"inline-block w-2 h-2 rounded-full shrink-0 " + dotClass} />
      <span className="flex-1 text-[12px] text-charcoal">{label}</span>
      <span className="text-[11px] text-charcoal-soft tabular-nums font-mono">
        {count} · {(pct * 100).toFixed(0)}%
      </span>
    </div>
  );
}

function EvidenceRow({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-baseline justify-between text-[12px]">
      <span className="text-charcoal-soft">{label}</span>
      <span
        className={
          "tabular-nums font-mono " +
          (count > 0 ? "text-charcoal font-semibold" : "text-charcoal-soft/60")
        }
      >
        {count} {count === 1 ? "farm" : "farms"}
      </span>
    </div>
  );
}

function CategoryRow({
  label,
  lbs,
  meals,
  nodes,
  dotClass,
}: {
  label: string;
  lbs: number;
  meals?: number;
  nodes: number;
  dotClass: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={"inline-block w-2 h-2 rounded-full shrink-0 " + dotClass} />
      <span className="flex-1 text-[12px] text-charcoal">{label}</span>
      <span className="text-[11px] text-charcoal-soft tabular-nums font-mono">
        {lbs > 0 ? `${fmtInt(Math.round(lbs))} lbs` : "—"}
        {typeof meals === "number" && meals > 0
          ? ` · ${fmtInt(Math.round(meals))} meals`
          : ""}
        {nodes > 0 ? ` · ${nodes} ${nodes === 1 ? "node" : "nodes"}` : ""}
      </span>
    </div>
  );
}
