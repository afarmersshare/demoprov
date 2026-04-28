"use client";

import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { FarmsMap } from "./farms-map";
import { FarmsList } from "./farms-list";
import { NetworkByCounty } from "./network-by-county";
import { FarmsSummary } from "./farms-summary";
import { FarmDetailPanel } from "./farm-detail-panel";
import {
  EntityDetailPanel,
  EntityDetailOverlay,
} from "./entity-detail-panel";
import { NetworkDirectory } from "./network-directory";
import { NetworkGraph } from "./network-graph";
import { NetworkFlows } from "./network-flows";
import { PolicymakerDashboard } from "../dashboards/policymaker";
import { AfsDashboard } from "../dashboards/afs";
import { FarmerDashboard } from "../dashboards/farmer";
import { BuyerDashboard } from "../dashboards/buyer";
import { EmbedCta } from "../embed-cta";
import { ReportsTab } from "./reports-tab";
import { PipelineDashboard } from "../dashboards/pipeline-dashboard";
import { LockedModule } from "../locked-module";
import { LandingTab } from "./landing-tab";
import type { ModuleSlug, Tier } from "@/lib/auth/get-user";
import { Lock } from "lucide-react";

export type Persona =
  | "policymaker"
  | "afs"
  | "farmer"
  | "buyer"
  | "hub"
  | "nonprofit"
  | "funder"
  | "explore";

export type Farm = {
  upid: string;
  name: string;
  farm_type: string | null;
  afs_member_status: string | null;
  acres_total: number | null;
  gross_revenue_baseline: number | null;
  gross_revenue_baseline_year: number | null;
  afs_priority_tier: string | null;
  county_fips: string | null;
  regenerative_claim_verified: string | null;
  scope3_platform: string | null;
  claim_risk_flags: string[] | null;
  attributes: Record<string, unknown> | null;
  geom_point: { coordinates: [number, number] } | null;
};

export type Market = {
  upid: string;
  name: string;
  market_type: string | null;
  afs_member_status: string | null;
  afs_priority_tier: string | null;
  address_text: string | null;
  attributes: Record<string, unknown> | null;
  geom_point: { coordinates: [number, number] } | null;
};

export type Distributor = {
  upid: string;
  name: string;
  distributor_type: string | null;
  afs_member_status: string | null;
  afs_priority_tier: string | null;
  address_text: string | null;
  attributes: Record<string, unknown> | null;
  geom_point: { coordinates: [number, number] } | null;
};

export type Processor = {
  upid: string;
  name: string;
  processor_type: string | null;
  afs_member_status: string | null;
  afs_priority_tier: string | null;
  address_text: string | null;
  county_fips: string | null;
  attributes: Record<string, unknown> | null;
  geom_point: { coordinates: [number, number] } | null;
};

export type RecoveryNode = {
  upid: string;
  name: string;
  recovery_node_type: string | null;
  contact_visibility: string | null;
  description: string | null;
  attributes: Record<string, unknown> | null;
  geom_point: { coordinates: [number, number] } | null;
};

export type Enabler = {
  upid: string;
  name: string;
  enabler_type: string | null;
  contact_visibility: string | null;
  description: string | null;
  attributes: Record<string, unknown> | null;
  geom_point: { coordinates: [number, number] } | null;
};

export type Region = {
  upid: string;
  name: string;
  region_type: string | null;
  fips_codes: string[] | null;
  description: string | null;
  attributes: Record<string, unknown> | null;
  geom_point: { coordinates: [number, number] } | null;
  geom_boundary: unknown;
};

export type FarmCrop = {
  farm_upid: string;
  crop_type: string;
  crop_category: string | null;
  is_primary: boolean | null;
  production_method: string | null;
  season: string | null;
  acres: number | null;
  attributes: Record<string, unknown> | null;
};

export type Relationship = {
  node_a_upid: string;
  node_b_upid: string;
  relationship_type: string;
  valid_from: string | null;
  attributes: Record<string, unknown> | null;
};

export type Person = {
  upid: string;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  contact_visibility: string | null;
  attributes: Record<string, unknown> | null;
};

// Compact per-attachment record used by impact/literacy surfaces.
// Loaded once globally and filtered per node_upid in-memory by the
// dashboards — avoids per-card Supabase round-trips. Only a handful of
// doc types hit impact framing, so the payload stays small.
export type ImpactDoc = {
  node_upid: string;
  document_type: string;
  expires_date: string | null;
};

const IMPACT_DOC_TYPES = [
  "soil_test",
  "cover_crop_plan",
  "nrcs_conservation_practice_plan",
  "organic_cert",
  "real_organic_cert",
  "gap_cert",
  "usda_grant_award",
];

// Compliance readiness checks whether a farm has the core paperwork
// institutional buyers ask for. Three categories, each satisfied by any one
// current doc from the list below. A farm with all three categories covered
// is "buyer-ready"; missing 1–2 is "close"; missing all three is "needs work".
export const COMPLIANCE_CATEGORIES: Array<{ label: string; types: string[] }> = [
  {
    label: "Food safety",
    types: [
      "food_safety_plan",
      "gap_cert",
      "gfsi_sqf",
      "gfsi_brc",
      "gfsi_primus",
      "haccp_plan",
    ],
  },
  { label: "Water test", types: ["water_test"] },
  {
    label: "Liability insurance",
    types: ["liability_insurance", "product_liability_insurance"],
  },
];

const COMPLIANCE_DOC_TYPES = Array.from(
  new Set(COMPLIANCE_CATEGORIES.flatMap((c) => c.types)),
);

const ALL_RELEVANT_DOC_TYPES = Array.from(
  new Set([...IMPACT_DOC_TYPES, ...COMPLIANCE_DOC_TYPES]),
);

export type ComplianceStatus = "buyer_ready" | "close" | "needs_work";

export type ComplianceInfo = {
  status: ComplianceStatus;
  missing: string[]; // category labels the farm is missing
};

export function computeComplianceInfo(
  farmUpid: string,
  docs: ImpactDoc[],
): ComplianceInfo {
  const farmDocTypes = new Set(
    docs.filter((d) => d.node_upid === farmUpid).map((d) => d.document_type),
  );
  const missing = COMPLIANCE_CATEGORIES.filter(
    (c) => !c.types.some((t) => farmDocTypes.has(t)),
  ).map((c) => c.label);
  let status: ComplianceStatus;
  if (missing.length === 0) status = "buyer_ready";
  else if (missing.length <= 2) status = "close";
  else status = "needs_work";
  return { status, missing };
}

export type NetworkEntity =
  | { kind: "farm"; data: Farm }
  | { kind: "market"; data: Market }
  | { kind: "distributor"; data: Distributor }
  | { kind: "processor"; data: Processor }
  | { kind: "recovery_node"; data: RecoveryNode }
  | { kind: "enabler"; data: Enabler };

type StatusFilter = "all" | "enrolled" | "engaged" | "prospect";
type ComplianceFilter = "all" | "buyer_ready" | "close" | "needs_work";
const ALL_TYPES = "__all__";
const ALL_COUNTIES = "__all_counties__";
const ALL_COMPLIANCE = "all";

function prettify(raw: string): string {
  return raw.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

// Default tab order for "drop the user on their first entitled module" —
// matches the visual TabsList order so the auto-pick lines up with what the
// eye sees first.
const TAB_ORDER: ModuleSlug[] = [
  "landing",
  "dashboard",
  "map",
  "network",
  "flows",
  "list",
  "directory",
  "county",
  "pipeline",
  "reports",
];

export function NetworkExplorer({
  persona = "explore",
  embedMode = false,
  entitledModules,
  displayName,
  tier,
}: {
  persona?: Persona;
  embedMode?: boolean;
  // undefined = anonymous demo or pre-resolution → all tabs unlocked.
  // [] = signed in with zero entitlements (treat all tabs as locked).
  // Defined and non-empty = enforce: only listed slugs render the live tool.
  entitledModules?: ModuleSlug[];
  // Optional — used by the Landing tab to render "Welcome back, {name}" and
  // the tier badge. Anonymous visitors see a generic greeting.
  displayName?: string | null;
  tier?: Tier | null;
}) {
  // Treating "no plumbed entitlements" as "demo" preserves the existing
  // anonymous experience — the public landing/embed surfaces continue to
  // show every tool. Authed users always get a defined array (possibly
  // empty), so they always go through the gate.
  const enforcing = entitledModules !== undefined;
  const isUnlocked = (slug: ModuleSlug): boolean =>
    !enforcing || entitledModules.includes(slug);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [processors, setProcessors] = useState<Processor[]>([]);
  const [recoveryNodes, setRecoveryNodes] = useState<RecoveryNode[]>([]);
  const [enablers, setEnablers] = useState<Enabler[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [farmCrops, setFarmCrops] = useState<FarmCrop[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [impactDocs, setImpactDocs] = useState<ImpactDoc[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<string>(ALL_TYPES);
  const [countyFilter, setCountyFilter] = useState<string>(ALL_COUNTIES);
  const [complianceFilter, setComplianceFilter] =
    useState<ComplianceFilter>(ALL_COMPLIANCE);
  // Default landing surface per persona (locked tier x modules matrix
  // 2026-04-28). Operators (farmer, buyer, hub) land on the personalized
  // Landing tab; observers (policymaker, afs, nonprofit, funder) land on
  // Dashboard; explore lands on Map. The auto-pick useEffect below catches
  // anyone whose tier doesn't actually entitle them to that default.
  const defaultTabForPersona = (p: Persona): string => {
    if (embedMode) return "map";
    if (p === "explore") return "map";
    if (p === "farmer" || p === "buyer" || p === "hub") return "landing";
    return "dashboard";
  };
  const [activeTab, setActiveTab] = useState<string>(
    defaultTabForPersona(persona),
  );
  const [selectedEntity, setSelectedEntity] = useState<NetworkEntity | null>(
    null,
  );

  // If a signed-in user lands on a tab their tier doesn't include, jump
  // them to the first entitled tab in canonical order. Demo / anonymous
  // users (entitledModules undefined) skip this entirely. Runs once
  // entitlements resolve; later user-initiated tab changes aren't
  // overridden because the effect only fires on entitledModules changes
  // and the new activeTab is, by definition, entitled.
  useEffect(() => {
    if (!enforcing) return;
    if (isUnlocked(activeTab as ModuleSlug)) return;
    const fallback = TAB_ORDER.find((slug) => isUnlocked(slug));
    if (fallback) setActiveTab(fallback);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entitledModules]);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase
        .from("farms")
        .select(
          "upid, name, farm_type, afs_member_status, acres_total, gross_revenue_baseline, gross_revenue_baseline_year, afs_priority_tier, county_fips, regenerative_claim_verified, scope3_platform, claim_risk_flags, attributes, geom_point",
        ),
      supabase
        .from("markets")
        .select(
          "upid, name, market_type, afs_member_status, afs_priority_tier, address_text, attributes, geom_point",
        ),
      supabase
        .from("distributors")
        .select(
          "upid, name, distributor_type, afs_member_status, afs_priority_tier, address_text, attributes, geom_point",
        ),
      supabase
        .from("processors")
        .select(
          "upid, name, processor_type, afs_member_status, afs_priority_tier, address_text, county_fips, attributes, geom_point",
        ),
      supabase
        .from("recovery_nodes")
        .select(
          "upid, name, recovery_node_type, contact_visibility, description, attributes, geom_point",
        ),
      supabase
        .from("enablers")
        .select(
          "upid, name, enabler_type, contact_visibility, description, attributes, geom_point",
        ),
      supabase
        .from("regions")
        .select(
          "upid, name, region_type, fips_codes, description, attributes, geom_point, geom_boundary",
        ),
      supabase
        .from("farm_crops")
        .select(
          "farm_upid, crop_type, crop_category, is_primary, production_method, season, acres, attributes",
        ),
      supabase
        .from("relationships")
        .select(
          "node_a_upid, node_b_upid, relationship_type, valid_from, attributes",
        ),
      supabase
        .from("persons")
        .select(
          "upid, full_name, first_name, last_name, contact_visibility, attributes",
        ),
      supabase
        .from("v_document_status")
        .select("node_upid, document_type, expires_date")
        .in("document_type", ALL_RELEVANT_DOC_TYPES)
        .eq("is_current", true),
    ]).then((results) => {
      setLoading(false);
      const firstError = results.find((r) => r.error)?.error;
      if (firstError) {
        setLoadError(firstError.message);
        return;
      }
      const [
        fRes,
        mRes,
        dRes,
        pRes,
        rnRes,
        enRes,
        rRes,
        cRes,
        relRes,
        pxRes,
        idRes,
      ] = results;
      setFarms((fRes.data ?? []) as Farm[]);
      setMarkets((mRes.data ?? []) as Market[]);
      setDistributors((dRes.data ?? []) as Distributor[]);
      setProcessors((pRes.data ?? []) as Processor[]);
      setRecoveryNodes((rnRes.data ?? []) as RecoveryNode[]);
      setEnablers((enRes.data ?? []) as Enabler[]);
      setRegions((rRes.data ?? []) as Region[]);
      setFarmCrops((cRes.data ?? []) as FarmCrop[]);
      setRelationships((relRes.data ?? []) as Relationship[]);
      setPersons((pxRes.data ?? []) as Person[]);
      setImpactDocs((idRes.data ?? []) as ImpactDoc[]);
    });
  }, []);

  const availableTypes = useMemo(() => {
    const set = new Set<string>();
    for (const f of farms) {
      if (f.farm_type) set.add(f.farm_type);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [farms]);

  const availableCounties = useMemo(() => {
    const set = new Set<string>();
    for (const f of farms) {
      const county = (f.attributes as { county_name?: string } | null)
        ?.county_name;
      if (county) set.add(county);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [farms]);

  const complianceByFarm = useMemo(() => {
    const map = new Map<string, ComplianceInfo>();
    for (const f of farms) {
      map.set(f.upid, computeComplianceInfo(f.upid, impactDocs));
    }
    return map;
  }, [farms, impactDocs]);

  const filteredFarms = useMemo(() => {
    return farms.filter((f) => {
      if (statusFilter !== "all" && f.afs_member_status !== statusFilter) {
        return false;
      }
      if (typeFilter !== ALL_TYPES && f.farm_type !== typeFilter) {
        return false;
      }
      if (countyFilter !== ALL_COUNTIES) {
        const county = (f.attributes as { county_name?: string } | null)
          ?.county_name;
        if (county !== countyFilter) return false;
      }
      if (complianceFilter !== ALL_COMPLIANCE) {
        const info = complianceByFarm.get(f.upid);
        if (!info || info.status !== complianceFilter) return false;
      }
      return true;
    });
  }, [
    farms,
    statusFilter,
    typeFilter,
    countyFilter,
    complianceFilter,
    complianceByFarm,
  ]);

  const filterActive =
    statusFilter !== "all" ||
    typeFilter !== ALL_TYPES ||
    countyFilter !== ALL_COUNTIES ||
    complianceFilter !== ALL_COMPLIANCE;

  const buyerReadyCount = useMemo(() => {
    let n = 0;
    for (const info of complianceByFarm.values()) {
      if (info.status === "buyer_ready") n += 1;
    }
    return n;
  }, [complianceByFarm]);

  // Non-farm entities aren't affected by the farm-type or county filters,
  // only by the global status filter. Recovery nodes and enablers don't
  // carry afs_member_status at all — they use an attributes.afs_active bool —
  // so when a status is actively selected we hide them entirely. The
  // By-county tab surfaces a note explaining this.
  const filteredMarkets = useMemo(() => {
    return markets.filter((m) =>
      statusFilter === "all" ? true : m.afs_member_status === statusFilter,
    );
  }, [markets, statusFilter]);

  const filteredDistributors = useMemo(() => {
    return distributors.filter((d) =>
      statusFilter === "all" ? true : d.afs_member_status === statusFilter,
    );
  }, [distributors, statusFilter]);

  const filteredProcessors = useMemo(() => {
    return processors.filter((p) =>
      statusFilter === "all" ? true : p.afs_member_status === statusFilter,
    );
  }, [processors, statusFilter]);

  const filteredRecoveryNodes = useMemo(
    () => (statusFilter === "all" ? recoveryNodes : []),
    [recoveryNodes, statusFilter],
  );

  const filteredEnablers = useMemo(
    () => (statusFilter === "all" ? enablers : []),
    [enablers, statusFilter],
  );

  // Farms scoped by status + type but NOT by county — the By-county tab
  // shows every county, so the county dropdown is meaningless there.
  const farmsForByCounty = useMemo(() => {
    return farms.filter((f) => {
      if (statusFilter !== "all" && f.afs_member_status !== statusFilter) {
        return false;
      }
      if (typeFilter !== ALL_TYPES && f.farm_type !== typeFilter) {
        return false;
      }
      return true;
    });
  }, [farms, statusFilter, typeFilter]);

  useEffect(() => {
    if (!selectedEntity) return;
    let stillIn = false;
    switch (selectedEntity.kind) {
      case "farm":
        stillIn = filteredFarms.some(
          (f) => f.upid === selectedEntity.data.upid,
        );
        break;
      case "market":
        stillIn = filteredMarkets.some(
          (m) => m.upid === selectedEntity.data.upid,
        );
        break;
      case "distributor":
        stillIn = filteredDistributors.some(
          (d) => d.upid === selectedEntity.data.upid,
        );
        break;
      case "processor":
        stillIn = filteredProcessors.some(
          (p) => p.upid === selectedEntity.data.upid,
        );
        break;
      case "recovery_node":
        stillIn = filteredRecoveryNodes.some(
          (r) => r.upid === selectedEntity.data.upid,
        );
        break;
      case "enabler":
        stillIn = filteredEnablers.some(
          (e) => e.upid === selectedEntity.data.upid,
        );
        break;
    }
    if (!stillIn) setSelectedEntity(null);
  }, [
    filteredFarms,
    filteredMarkets,
    filteredDistributors,
    filteredProcessors,
    filteredRecoveryNodes,
    filteredEnablers,
    selectedEntity,
  ]);

  const selectedFarm: Farm | null =
    selectedEntity && selectedEntity.kind === "farm"
      ? selectedEntity.data
      : null;
  const mapPinCount =
    filteredFarms.length +
    filteredMarkets.length +
    filteredDistributors.length +
    filteredProcessors.length +
    filteredRecoveryNodes.length +
    filteredEnablers.length;

  // Landing tab is intentionally chrome-free: no hero stats, no filter bar,
  // no compliance chip. The Landing copy is the surface; the rest of the
  // explorer's data scaffolding belongs to the working tabs.
  const showExplorerChrome = activeTab !== "landing";

  return (
    <div>
      {showExplorerChrome && (loading ? (
        <div className="mb-6 text-sm text-charcoal-soft">Loading…</div>
      ) : loadError ? (
        <div className="mb-6 text-sm text-red-700">Error: {loadError}</div>
      ) : (
        <FarmsSummary
          filteredFarms={filteredFarms}
          totalFarms={farms}
          filterActive={filterActive}
        />
      ))}

      {showExplorerChrome && (
      <div className="mb-5 rounded-[14px] border border-cream-shadow bg-white px-4 py-4 sm:px-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-8 sm:gap-y-3">
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
          <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft">
            Member status
          </label>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={statusFilter}
            onValueChange={(v) => {
              if (v) setStatusFilter(v as StatusFilter);
            }}
            className="w-full sm:w-auto"
          >
            <ToggleGroupItem value="all" className="flex-1 sm:flex-none">All</ToggleGroupItem>
            <ToggleGroupItem value="enrolled" className="flex-1 sm:flex-none">Enrolled</ToggleGroupItem>
            <ToggleGroupItem value="engaged" className="flex-1 sm:flex-none">Engaged</ToggleGroupItem>
            <ToggleGroupItem value="prospect" className="flex-1 sm:flex-none">Prospect</ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
          <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft">
            Farm type
          </label>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:min-w-[180px] sm:w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_TYPES}>All types</SelectItem>
              {availableTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {prettify(t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {activeTab !== "county" ? (
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
            <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft">
              County
            </label>
            <Select value={countyFilter} onValueChange={setCountyFilter}>
              <SelectTrigger className="w-full sm:min-w-[180px] sm:w-auto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_COUNTIES}>All counties</SelectItem>
                {availableCounties.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
          <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft">
            Compliance
          </label>
          <Select
            value={complianceFilter}
            onValueChange={(v) => setComplianceFilter(v as ComplianceFilter)}
          >
            <SelectTrigger className="w-full sm:min-w-[180px] sm:w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_COMPLIANCE}>All farms</SelectItem>
              <SelectItem value="buyer_ready">Buyer-ready</SelectItem>
              <SelectItem value="close">1–2 docs short</SelectItem>
              <SelectItem value="needs_work">Needs work</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filterActive ? (
          <button
            type="button"
            onClick={() => {
              setStatusFilter("all");
              setTypeFilter(ALL_TYPES);
              setCountyFilter(ALL_COUNTIES);
              setComplianceFilter(ALL_COMPLIANCE);
            }}
            className="self-start text-xs text-charcoal-soft underline underline-offset-2 hover:text-slate-blue sm:ml-auto sm:self-auto"
          >
            Clear filters
          </button>
        ) : null}
      </div>
      )}

      {showExplorerChrome && complianceFilter !== ALL_COMPLIANCE ? (
        <div className="mb-4 -mt-1 inline-flex items-center gap-2 rounded-full bg-slate-blue/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-blue">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-blue" />
          Compliance filter: {filteredFarms.length}{" "}
          {complianceFilter === "buyer_ready"
            ? "buyer-ready"
            : complianceFilter === "close"
              ? "close to ready"
              : "need work"}
          {complianceFilter === "buyer_ready" && buyerReadyCount !== filteredFarms.length
            ? ` (of ${buyerReadyCount} in region)`
            : null}
        </div>
      ) : null}

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        {/*
          Mobile: 3-column grid so all 9 tabs are visible at once with no
          horizontal scroll (see commit "Mobile: stack tabs..."). Desktop
          (sm+): revert to the original inline-flex strip via tailwind-merge
          override of the cva defaults in TabsList.
        */}
        <TabsList className="!grid !grid-cols-3 !gap-1 !w-full !h-auto !p-1.5 sm:!inline-flex sm:!gap-0 sm:!w-fit sm:!h-8 sm:!p-[3px]">
          <TabTriggerWithLock slug="landing" locked={!isUnlocked("landing")}>
            Landing
          </TabTriggerWithLock>
          <TabTriggerWithLock slug="map" locked={!isUnlocked("map")}>
            Map
          </TabTriggerWithLock>
          <TabTriggerWithLock slug="network" locked={!isUnlocked("network")}>
            Network
          </TabTriggerWithLock>
          {/*
            Flows is a 4-column d3-sankey. Long node names ("Restaurant
            Independent", "Foodservice Management", "Institution Hospital")
            overlap below tablet-landscape width because d3-sankey doesn't
            reserve label space. Hidden below lg (1024px) — covers phones
            in any orientation and tablet portrait; reappears on tablet
            landscape and desktop.
          */}
          <TabTriggerWithLock
            slug="flows"
            locked={!isUnlocked("flows")}
            className="hidden lg:flex"
          >
            Flows
          </TabTriggerWithLock>
          <TabTriggerWithLock slug="list" locked={!isUnlocked("list")}>
            List
          </TabTriggerWithLock>
          <TabTriggerWithLock
            slug="directory"
            locked={!isUnlocked("directory")}
          >
            Directory
          </TabTriggerWithLock>
          <TabTriggerWithLock slug="county" locked={!isUnlocked("county")}>
            By county
          </TabTriggerWithLock>
          <TabTriggerWithLock
            slug="dashboard"
            locked={!isUnlocked("dashboard")}
          >
            Dashboard
          </TabTriggerWithLock>
          <TabTriggerWithLock slug="pipeline" locked={!isUnlocked("pipeline")}>
            Pipeline
          </TabTriggerWithLock>
          <TabTriggerWithLock slug="reports" locked={!isUnlocked("reports")}>
            Reports
          </TabTriggerWithLock>
        </TabsList>
        <TabsContent value="landing" className="mt-4">
          {isUnlocked("landing") ? (
            <LandingTab
              persona={persona}
              displayName={displayName}
              tier={tier}
              onSelectTab={setActiveTab}
            />
          ) : (
            <LockedModule slug="landing" />
          )}
        </TabsContent>
        <TabsContent value="map" className="mt-4">
          {isUnlocked("map") ? (
            <div className="md:grid md:grid-cols-[1fr_340px] md:gap-5">
              <FarmsMap
                farms={filteredFarms}
                markets={filteredMarkets}
                distributors={filteredDistributors}
                processors={filteredProcessors}
                recoveryNodes={filteredRecoveryNodes}
                enablers={filteredEnablers}
                regions={regions}
                selected={selectedEntity}
                onSelect={setSelectedEntity}
              />
              <div className="hidden md:block">
                <EntityDetailPanel
                  entity={selectedEntity}
                  entityCount={mapPinCount}
                  hintToClick="Click any marker on the map to see details."
                  embedMode={embedMode}
                  complianceByFarm={complianceByFarm}
                />
              </div>
            </div>
          ) : (
            <LockedModule slug="map" />
          )}
        </TabsContent>
        <TabsContent value="network" className="mt-4">
          {isUnlocked("network") ? (
            <div className="md:grid md:grid-cols-[1fr_340px] md:gap-5">
              <NetworkGraph
                farms={filteredFarms}
                markets={filteredMarkets}
                distributors={filteredDistributors}
                processors={filteredProcessors}
                recoveryNodes={filteredRecoveryNodes}
                enablers={filteredEnablers}
                relationships={relationships}
                persons={persons}
                selected={selectedEntity}
                onSelect={setSelectedEntity}
              />
              <div className="hidden md:block">
                <EntityDetailPanel
                  entity={selectedEntity}
                  entityCount={mapPinCount}
                  hintToClick="Click any node in the graph to see details."
                  embedMode={embedMode}
                  complianceByFarm={complianceByFarm}
                />
              </div>
            </div>
          ) : (
            <LockedModule slug="network" />
          )}
        </TabsContent>
        <TabsContent value="flows" className="mt-4">
          {isUnlocked("flows") ? (
            <NetworkFlows
              farms={filteredFarms}
              markets={filteredMarkets}
              distributors={filteredDistributors}
              processors={filteredProcessors}
              recoveryNodes={filteredRecoveryNodes}
              relationships={relationships}
            />
          ) : (
            <LockedModule slug="flows" />
          )}
        </TabsContent>
        <TabsContent value="list" className="mt-4">
          {isUnlocked("list") ? (
            <div className="md:grid md:grid-cols-[1fr_340px] md:gap-5">
              <FarmsList
                farms={filteredFarms}
                selected={selectedFarm}
                onSelect={(f) =>
                  setSelectedEntity(f ? { kind: "farm", data: f } : null)
                }
              />
              <div className="hidden md:block">
                <FarmDetailPanel
                  farm={selectedFarm}
                  farmCount={filteredFarms.length}
                  hintToClick="Click any row to see details for that farm."
                />
              </div>
            </div>
          ) : (
            <LockedModule slug="list" />
          )}
        </TabsContent>
        <TabsContent value="directory" className="mt-4">
          {isUnlocked("directory") ? (
            <NetworkDirectory
              farms={farms}
              markets={markets}
              distributors={distributors}
              processors={processors}
              recoveryNodes={recoveryNodes}
              enablers={enablers}
              statusFilter={statusFilter}
            />
          ) : (
            <LockedModule slug="directory" />
          )}
        </TabsContent>
        <TabsContent value="county" className="mt-4">
          {isUnlocked("county") ? (
            <div className="md:grid md:grid-cols-[1fr_340px] md:gap-5">
              <NetworkByCounty
                farms={farmsForByCounty}
                markets={filteredMarkets}
                distributors={filteredDistributors}
                processors={filteredProcessors}
                recoveryNodes={filteredRecoveryNodes}
                enablers={filteredEnablers}
                regions={regions}
                statusFilter={statusFilter}
                onSelect={setSelectedEntity}
              />
              <div className="hidden md:block">
                <EntityDetailPanel
                  entity={selectedEntity}
                  entityCount={mapPinCount}
                  hintToClick="Expand a county and click any entity name to see details."
                  embedMode={embedMode}
                  complianceByFarm={complianceByFarm}
                />
              </div>
            </div>
          ) : (
            <LockedModule slug="county" />
          )}
        </TabsContent>
        <TabsContent value="dashboard" className="mt-4">
          {isUnlocked("dashboard") ? (
          <div className="md:grid md:grid-cols-[1fr_340px] md:gap-5 md:items-start">
            {persona === "afs" ? (
              <AfsDashboard
                farms={farmsForByCounty}
                markets={filteredMarkets}
                processors={filteredProcessors}
                recoveryNodes={filteredRecoveryNodes}
                enablers={filteredEnablers}
                regions={regions}
                farmCrops={farmCrops}
                impactDocs={impactDocs}
                selected={selectedEntity}
                onSelect={setSelectedEntity}
              />
            ) : persona === "farmer" ? (
              <FarmerDashboard
                farms={farmsForByCounty}
                markets={filteredMarkets}
                processors={filteredProcessors}
                recoveryNodes={filteredRecoveryNodes}
                enablers={filteredEnablers}
                regions={regions}
                farmCrops={farmCrops}
                impactDocs={impactDocs}
                selected={selectedEntity}
                onSelect={setSelectedEntity}
              />
            ) : persona === "buyer" || persona === "hub" ? (
              <BuyerDashboard
                farms={farmsForByCounty}
                markets={filteredMarkets}
                processors={filteredProcessors}
                recoveryNodes={filteredRecoveryNodes}
                enablers={filteredEnablers}
                regions={regions}
                farmCrops={farmCrops}
                impactDocs={impactDocs}
                selected={selectedEntity}
                onSelect={setSelectedEntity}
              />
            ) : (
              <PolicymakerDashboard
                farms={farmsForByCounty}
                markets={filteredMarkets}
                processors={filteredProcessors}
                recoveryNodes={filteredRecoveryNodes}
                enablers={filteredEnablers}
                regions={regions}
                farmCrops={farmCrops}
                impactDocs={impactDocs}
                selected={selectedEntity}
                onSelect={setSelectedEntity}
              />
            )}
            <div className="hidden md:block md:sticky md:top-4">
              <EntityDetailPanel
                entity={selectedEntity}
                entityCount={mapPinCount}
                hintToClick="Click any pin on the map to see that entity's details."
                embedMode={embedMode}
                complianceByFarm={complianceByFarm}
              />
            </div>
          </div>
          ) : (
            <LockedModule slug="dashboard" />
          )}
        </TabsContent>
        <TabsContent value="pipeline" className="mt-4">
          {isUnlocked("pipeline") ? (
            <PipelineDashboard
              farms={filteredFarms}
              complianceByFarm={complianceByFarm}
            />
          ) : (
            <LockedModule slug="pipeline" />
          )}
        </TabsContent>
        <TabsContent value="reports" className="mt-4">
          {isUnlocked("reports") ? (
            <ReportsTab
              farms={filteredFarms}
              markets={filteredMarkets}
              distributors={filteredDistributors}
              processors={filteredProcessors}
              recoveryNodes={filteredRecoveryNodes}
              enablers={filteredEnablers}
              farmCrops={farmCrops}
              impactDocs={impactDocs}
              regions={regions}
              complianceByFarm={complianceByFarm}
            />
          ) : (
            <LockedModule slug="reports" />
          )}
        </TabsContent>
      </Tabs>

      <EntityDetailOverlay
        entity={selectedEntity}
        entityCount={mapPinCount}
        onClose={() => setSelectedEntity(null)}
        embedMode={embedMode}
        complianceByFarm={complianceByFarm}
      />

      {(() => {
        // Embed iframes always get the escape-hatch CTA. Persona views get the
        // "explore the full demo" CTA only when there's actually more to see —
        // i.e. the user is anonymous (no entitlements enforced) or has at
        // least one locked tab. Tiers with everything unlocked
        // (afs_internal, aggregator_licensed, demo) hide the persona CTA.
        if (embedMode) {
          return <EmbedCta variant="embed" />;
        }
        if (persona === "explore") return null;
        const hasLockedTab =
          enforcing && TAB_ORDER.some((s) => !entitledModules.includes(s));
        if (enforcing && !hasLockedTab) return null;
        return <EmbedCta variant="persona" />;
      })()}
    </div>
  );
}

// TabsTrigger plus an inline lock glyph for modules the user's tier doesn't
// include. Locked tabs stay clickable — the TabsContent renders a
// LockedModule upsell rather than the live tool. Treat the glyph as a hint,
// not a blocker.
function TabTriggerWithLock({
  slug,
  locked,
  className,
  children,
}: {
  slug: ModuleSlug;
  locked: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <TabsTrigger
      value={slug}
      className={className}
      aria-label={locked ? `${slug} (locked)` : undefined}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {locked ? (
          <Lock className="h-2.5 w-2.5 opacity-60" aria-hidden />
        ) : null}
      </span>
    </TabsTrigger>
  );
}

