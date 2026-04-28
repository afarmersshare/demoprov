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
import {
  Lock,
  Layers,
  Map as MapIcon,
  Waves,
  Sprout,
} from "lucide-react";

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
// matches the visual cluster order so the auto-pick lines up with what the
// eye sees first.
const TAB_ORDER: ModuleSlug[] = [
  "landing",
  "dashboard",
  "map",
  "directory",
  "list",
  "county",
  "network",
  "flows",
  "reports",
  "pipeline",
];

// IA structure (Calla consult, 2026-04-28). Watershed cartography rendered
// as macro-to-micro: the viewer flies at one of four altitudes, slices by
// one of four focus areas, and views the data either at the full-foodshed
// scope or scoped to their organization. Reports and Pipeline are
// orthogonal utilities, accessible from any cell.
//
//   SCOPE    (foodshed | org)                             ← top-level toggle
//   ALTITUDE (system · territory · flow · ground)         ← what scale
//   FOCUS    (overview · farms · buyers · gaps)           ← what aspect
//   METADATA (entity counts, gaps flagged, last updated)  ← state of cell

type Altitude = "system" | "territory" | "flow" | "ground";
type Focus = "overview" | "farms" | "buyers" | "gaps";
type Scope = "foodshed" | "org";

// Per-altitude accent classes — applied to the icon, the active-state
// underline, and the active-state ring. Each altitude has a distinct
// accent so the viewer can see at a glance which altitude they're at,
// even peripheral. Macro to micro reads cool→warm: slate-blue (basin) →
// forest-sage (land) → terracotta (movement) → amber (the soil where
// things grow). All four are existing palette tokens.
const ALTITUDES: {
  id: Altitude;
  label: string;
  gloss: string;
  Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  accent: {
    icon: string; // text color for the icon (always-on)
    activeBar: string; // bottom underline / accent bar when active
    activeRing: string; // ring color when active
    activeBg: string; // background color when active
    activeText: string; // text color when active
  };
}[] = [
  {
    id: "system",
    label: "System",
    gloss: "The whole basin",
    Icon: Layers,
    accent: {
      icon: "text-slate-blue",
      activeBar: "bg-slate-blue",
      activeRing: "ring-slate-blue/40",
      activeBg: "bg-slate-blue/10",
      activeText: "text-slate-blue",
    },
  },
  {
    id: "territory",
    label: "Territory",
    gloss: "The geography",
    Icon: MapIcon,
    accent: {
      icon: "text-forest-sage",
      activeBar: "bg-forest-sage",
      activeRing: "ring-forest-sage/40",
      activeBg: "bg-forest-sage/10",
      activeText: "text-forest-sage",
    },
  },
  {
    id: "flow",
    label: "Flow",
    gloss: "How things move",
    Icon: Waves,
    accent: {
      icon: "text-terracotta",
      activeBar: "bg-terracotta",
      activeRing: "ring-terracotta/40",
      activeBg: "bg-terracotta/10",
      activeText: "text-terracotta",
    },
  },
  {
    id: "ground",
    label: "Ground",
    gloss: "On the ground",
    Icon: Sprout,
    accent: {
      icon: "text-amber",
      activeBar: "bg-amber",
      activeRing: "ring-amber/40",
      activeBg: "bg-amber/10",
      activeText: "text-amber",
    },
  },
];

const FOCI: { id: Focus; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "farms", label: "Farms" },
  { id: "buyers", label: "Buyers" },
  { id: "gaps", label: "Gaps" },
];

// (altitude, focus) → which existing TabsContent value renders. Cells with
// no mapping render a generic "coming soon" placeholder. As Phase-3 surfaces
// land, fill cells in here rather than adding another flat tab.
const CELL_TO_SLUG: Record<Altitude, Partial<Record<Focus, ModuleSlug>>> = {
  system: { overview: "dashboard" },
  territory: { overview: "map", gaps: "county" },
  flow: { overview: "network", gaps: "flows" },
  ground: { overview: "directory", farms: "list" },
};

// Reverse lookup: which (altitude, focus) renders a given slug. Used when
// LandingTab cards or other UI wants to navigate by slug — the IA layer
// translates that to the new coordinates.
function cellForSlug(
  slug: ModuleSlug,
): { altitude: Altitude; focus: Focus } | null {
  for (const altitude of Object.keys(CELL_TO_SLUG) as Altitude[]) {
    const foci = CELL_TO_SLUG[altitude];
    for (const focus of Object.keys(foci) as Focus[]) {
      if (foci[focus] === slug) return { altitude, focus };
    }
  }
  return null;
}

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
  // Default IA cell per persona. Operators (farmer, buyer, hub) start in
  // SYSTEM × OVERVIEW at org scope — what was the "Landing" tab is now
  // the org-scoped read of the highest altitude. Observers
  // (policymaker, nonprofit, funder, afs) start in SYSTEM × OVERVIEW at
  // foodshed scope — the persona-keyed Dashboard. Explore lands at
  // TERRITORY × OVERVIEW (the map of the region they haven't placed
  // themselves in yet). Embed mode also starts at TERRITORY × OVERVIEW.
  const defaultCellForPersona = (
    p: Persona,
  ): { altitude: Altitude; focus: Focus; scope: Scope } => {
    if (embedMode)
      return { altitude: "territory", focus: "overview", scope: "foodshed" };
    if (p === "explore")
      return { altitude: "territory", focus: "overview", scope: "foodshed" };
    if (p === "farmer" || p === "buyer" || p === "hub")
      return { altitude: "system", focus: "overview", scope: "org" };
    return { altitude: "system", focus: "overview", scope: "foodshed" };
  };
  const initialCell = defaultCellForPersona(persona);
  const [altitude, setAltitude] = useState<Altitude>(initialCell.altitude);
  const [focus, setFocus] = useState<Focus>(initialCell.focus);
  const [scope, setScope] = useState<Scope>(initialCell.scope);
  const [selectedEntity, setSelectedEntity] = useState<NetworkEntity | null>(
    null,
  );

  // activeTab is the underlying TabsContent key. Derived from
  // (altitude, focus) — when the cell maps to an existing surface, use
  // that slug; otherwise route to a "_placeholder" content slot. The
  // org-scope SYSTEM × OVERVIEW cell is special: it renders the
  // personalized Landing surface instead of the regional Dashboard.
  const activeTab: string = (() => {
    if (
      altitude === "system" &&
      focus === "overview" &&
      scope === "org" &&
      isUnlocked("landing")
    ) {
      return "landing";
    }
    return CELL_TO_SLUG[altitude]?.[focus] ?? "_placeholder";
  })();

  // Legacy setter — accepts a ModuleSlug (LandingTab capability cards,
  // etc.) and translates to the new (altitude, focus) coordinates.
  const setActiveTab = (slug: string) => {
    if (slug === "landing") {
      setAltitude("system");
      setFocus("overview");
      setScope("org");
      return;
    }
    const cell = cellForSlug(slug as ModuleSlug);
    if (cell) {
      setAltitude(cell.altitude);
      setFocus(cell.focus);
      return;
    }
    setAltitude("territory");
    setFocus("overview");
  };

  // If the user's tier doesn't include the underlying slug for the cell
  // they're on, jump them to the first entitled cell. Demo / anonymous
  // users (entitledModules undefined) skip this entirely.
  useEffect(() => {
    if (!enforcing) return;
    if (activeTab === "_placeholder") return;
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

  // Scope filter — applies before the user-controlled filter chain. When
  // a tenant is viewing in "my organization" scope, the dataset is
  // narrowed to records linked to their org. For v1 demo (no seeded
  // org-link data yet) we narrow to a deterministic subset that
  // demonstrates the toggle does something visible: regen-verified farms
  // for the farm side, the first three of each buyer-side entity type.
  // When real tenant data lands, replace this with a join on a
  // per-persona "what's mine" predicate.
  const scopedFarms = useMemo(() => {
    if (scope === "foodshed") return farms;
    return farms.filter((f) => f.regenerative_claim_verified).slice(0, 8);
  }, [farms, scope]);

  const scopedMarkets = useMemo(
    () => (scope === "foodshed" ? markets : markets.slice(0, 3)),
    [markets, scope],
  );
  const scopedDistributors = useMemo(
    () => (scope === "foodshed" ? distributors : distributors.slice(0, 2)),
    [distributors, scope],
  );
  const scopedProcessors = useMemo(
    () => (scope === "foodshed" ? processors : processors.slice(0, 2)),
    [processors, scope],
  );
  const scopedRecoveryNodes = useMemo(
    () => (scope === "foodshed" ? recoveryNodes : recoveryNodes.slice(0, 2)),
    [recoveryNodes, scope],
  );
  const scopedEnablers = useMemo(
    () => (scope === "foodshed" ? enablers : enablers.slice(0, 2)),
    [enablers, scope],
  );

  const filteredFarms = useMemo(() => {
    return scopedFarms.filter((f) => {
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
    scopedFarms,
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
    return scopedMarkets.filter((m) =>
      statusFilter === "all" ? true : m.afs_member_status === statusFilter,
    );
  }, [scopedMarkets, statusFilter]);

  const filteredDistributors = useMemo(() => {
    return scopedDistributors.filter((d) =>
      statusFilter === "all" ? true : d.afs_member_status === statusFilter,
    );
  }, [scopedDistributors, statusFilter]);

  const filteredProcessors = useMemo(() => {
    return scopedProcessors.filter((p) =>
      statusFilter === "all" ? true : p.afs_member_status === statusFilter,
    );
  }, [scopedProcessors, statusFilter]);

  const filteredRecoveryNodes = useMemo(
    () => (statusFilter === "all" ? scopedRecoveryNodes : []),
    [scopedRecoveryNodes, statusFilter],
  );

  const filteredEnablers = useMemo(
    () => (statusFilter === "all" ? scopedEnablers : []),
    [scopedEnablers, statusFilter],
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

  // Cells that render their own content (Landing welcome, placeholders
  // for unbuilt cells) skip the explorer chrome — no hero stats, no
  // filter bar, no compliance chip. Data-view cells (map, list, dashboard,
  // etc.) get the full chrome.
  const showExplorerChrome =
    activeTab !== "landing" && activeTab !== "_placeholder";

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

      {/* Watershed IA shell. Three rows: SCOPE (foodshed vs my-org),
          ALTITUDE (system → ground), FOCUS (slice within altitude),
          plus a metadata chip strip. The user always knows three things
          at a glance: what scale they're looking at, what aspect, and
          whether the data is the whole basin or just their piece. */}

      {/* Scope toggle — top of the IA, persistent across altitude
          changes. The single most important control on the page: it's
          where the subscription value moment lives. */}
      <div className="mb-3 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-charcoal-soft/80">
          Scope
        </span>
        <div className="inline-flex rounded-full border border-cream-shadow bg-white p-[3px] text-[11px] font-semibold uppercase tracking-[0.08em]">
          <button
            type="button"
            onClick={() => setScope("foodshed")}
            aria-pressed={scope === "foodshed"}
            className={
              "rounded-full px-3.5 py-1.5 transition-colors " +
              (scope === "foodshed"
                ? "bg-slate-blue text-warm-cream"
                : "text-charcoal-soft hover:text-slate-blue")
            }
          >
            The whole foodshed
          </button>
          <button
            type="button"
            onClick={() => setScope("org")}
            aria-pressed={scope === "org"}
            className={
              "rounded-full px-3.5 py-1.5 transition-colors " +
              (scope === "org"
                ? "bg-accent-amber text-charcoal"
                : "text-charcoal-soft hover:text-slate-blue")
            }
          >
            My organization
          </button>
        </div>
        {scope === "org" ? (
          <span className="text-[11px] italic text-charcoal-soft/85 leading-snug">
            Showing a sample of your-organization-shaped data. With your
            data connected, this is the live read of your operations.
          </span>
        ) : null}
      </div>

      {/* Altitude + Focus navigator — contained card with two stacked
          surfaces. The dark upper band is the altitude row (macro lens
          + per-altitude accent color); the lighter lower band is the
          focus row (slice within altitude). Two distinct surfaces in
          one widget so the user sees them as related but separate
          decisions. */}
      <div className="mb-3 overflow-hidden rounded-[14px] border border-cream-shadow shadow-sm">
        {/* Altitude row — dark band, four altitudes with their accent
            icons. Active altitude shows a thick accent underline at the
            bottom of the button. */}
        <div
          role="tablist"
          aria-label="Altitude"
          className="grid grid-cols-2 sm:grid-cols-4 bg-charcoal"
        >
          {ALTITUDES.map((a) => {
            const isActive = altitude === a.id;
            const Icon = a.Icon;
            return (
              <button
                key={a.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setAltitude(a.id)}
                className={
                  "group relative flex flex-col items-center gap-1.5 px-3 py-3.5 transition-colors " +
                  (isActive
                    ? "bg-charcoal-soft/30"
                    : "hover:bg-charcoal-soft/15")
                }
              >
                <Icon
                  className={
                    "h-4 w-4 transition-colors " +
                    (isActive
                      ? a.accent.icon
                      : a.accent.icon + " opacity-50 group-hover:opacity-90")
                  }
                  aria-hidden
                />
                <span
                  className={
                    "text-[11px] sm:text-[12px] font-semibold uppercase tracking-[0.14em] transition-colors " +
                    (isActive
                      ? "text-warm-cream"
                      : "text-warm-cream/55 group-hover:text-warm-cream/85")
                  }
                >
                  {a.label}
                </span>
                <span
                  aria-hidden
                  className={
                    "absolute bottom-0 left-3 right-3 h-[3px] rounded-t-full transition-opacity " +
                    a.accent.activeBar +
                    " " +
                    (isActive ? "opacity-100" : "opacity-0")
                  }
                />
              </button>
            );
          })}
        </div>

        {/* Focus row — lighter band, four focus columns. Active focus
            shows as a white pill. Same four options at every altitude
            so the schema is consistent. */}
        <div
          role="tablist"
          aria-label="Focus"
          className="grid grid-cols-2 sm:grid-cols-4 bg-charcoal-soft/95"
        >
          {FOCI.map((f) => {
            const isActive = focus === f.id;
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setFocus(f.id)}
                className={
                  "px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors " +
                  (isActive
                    ? "bg-warm-cream text-charcoal"
                    : "text-warm-cream/70 hover:text-warm-cream hover:bg-charcoal-soft/60")
                }
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Metadata chips — current cell's state at a glance. The active
          altitude's accent color tints the entity-count chip so the chip
          row reinforces the altitude you're at. */}
      <div className="mb-4 flex flex-wrap gap-1.5 text-[11px]">
        {(() => {
          const a = ALTITUDES.find((x) => x.id === altitude)!;
          return (
            <span
              className={
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold uppercase tracking-[0.06em] " +
                a.accent.activeBg +
                " " +
                a.accent.activeText
              }
            >
              {filteredFarms.length +
                filteredMarkets.length +
                filteredDistributors.length +
                filteredProcessors.length +
                filteredRecoveryNodes.length +
                filteredEnablers.length}{" "}
              entities
            </span>
          );
        })()}
        <span className="inline-flex items-center gap-1.5 rounded-full bg-cream-deep/60 px-3 py-1 text-charcoal-soft font-semibold uppercase tracking-[0.06em]">
          {Math.max(0, scopedFarms.length - buyerReadyCount)} farms with
          gaps
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-cream-deep/40 px-3 py-1 text-charcoal-soft/80 italic">
          last sync · demo dataset
        </span>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
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
        <TabsContent value="_placeholder" className="mt-4">
          <CellPlaceholder
            altitude={altitude}
            focus={focus}
            scope={scope}
            onJumpToOverview={() => setFocus("overview")}
          />
        </TabsContent>
      </Tabs>

      {/* Reports + Pipeline live outside the altitude system — they're
          orthogonal utilities accessible from any cell. Reports is a
          spans-altitudes export tool; Pipeline is AFS-internal-only. */}
      <div className="mt-6 pt-4 border-t border-cream-shadow/60 flex flex-wrap gap-2 items-center">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-charcoal-soft/70">
          Tools
        </span>
        <button
          type="button"
          onClick={() => setActiveTab("reports")}
          className={
            "rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors " +
            (activeTab === "reports"
              ? "border-slate-blue bg-slate-blue text-warm-cream"
              : "border-cream-shadow bg-white text-charcoal-soft hover:border-slate-blue hover:text-slate-blue")
          }
        >
          Reports
        </button>
        {isUnlocked("pipeline") ? (
          <button
            type="button"
            onClick={() => setActiveTab("pipeline")}
            className={
              "rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors " +
              (activeTab === "pipeline"
                ? "border-slate-blue bg-slate-blue text-warm-cream"
                : "border-cream-shadow bg-white text-charcoal-soft hover:border-slate-blue hover:text-slate-blue")
            }
          >
            Pipeline · AFS
          </button>
        ) : null}
      </div>

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

// Cell placeholder — rendered when the active (altitude, focus, scope)
// triple has no live surface yet. Empty states are framed as "what you'd
// see here" instead of "coming soon," with a one-click jump to the
// overview cell at the same altitude (which always has a real surface).
function CellPlaceholder({
  altitude,
  focus,
  scope,
  onJumpToOverview,
}: {
  altitude: Altitude;
  focus: Focus;
  scope: Scope;
  onJumpToOverview: () => void;
}) {
  const altitudeLabel =
    ALTITUDES.find((a) => a.id === altitude)?.label ?? altitude;
  const focusLabel = FOCI.find((f) => f.id === focus)?.label ?? focus;
  const lede = (() => {
    if (focus === "farms")
      return `Farm-side ${altitudeLabel.toLowerCase()} view — same altitude, narrowed to producers.`;
    if (focus === "buyers")
      return `Buyer-side ${altitudeLabel.toLowerCase()} view — same altitude, narrowed to demand.`;
    if (focus === "gaps")
      return `Where the ${altitudeLabel.toLowerCase()} has thin coverage, missing connections, or compliance work to close.`;
    return `${altitudeLabel} × ${focusLabel} — coming as the data layer fills in.`;
  })();
  return (
    <div className="rounded-[14px] border border-cream-shadow bg-white p-6 sm:p-10">
      <div className="mx-auto max-w-xl text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-cream-deep/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-charcoal-soft">
          {altitudeLabel} · {focusLabel}
          {scope === "org" ? " · Your organization" : ""}
        </div>
        <h2 className="mt-5 font-display text-[22px] sm:text-[24px] font-semibold text-slate-blue leading-[1.2] tracking-[-0.015em]">
          This view is on the way.
        </h2>
        <p className="mt-2.5 text-[14px] leading-relaxed text-charcoal-soft">
          {lede}
        </p>
        <button
          type="button"
          onClick={onJumpToOverview}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-blue px-5 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-warm-cream hover:bg-slate-blue-light transition-colors"
        >
          See {altitudeLabel} · Overview
          <span aria-hidden>→</span>
        </button>
      </div>
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

