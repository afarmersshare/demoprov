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

export type Persona =
  | "policymaker"
  | "afs"
  | "farmer"
  | "buyer"
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

export type NetworkEntity =
  | { kind: "farm"; data: Farm }
  | { kind: "market"; data: Market }
  | { kind: "distributor"; data: Distributor }
  | { kind: "processor"; data: Processor }
  | { kind: "recovery_node"; data: RecoveryNode }
  | { kind: "enabler"; data: Enabler };

type StatusFilter = "all" | "enrolled" | "engaged" | "prospect";
const ALL_TYPES = "__all__";
const ALL_COUNTIES = "__all_counties__";

function prettify(raw: string): string {
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function NetworkExplorer({
  persona = "explore",
  embedMode = false,
}: {
  persona?: Persona;
  embedMode?: boolean;
}) {
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
  const [activeTab, setActiveTab] = useState<string>(
    embedMode ? "map" : persona === "explore" ? "map" : "dashboard",
  );
  const [selectedEntity, setSelectedEntity] = useState<NetworkEntity | null>(
    null,
  );

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
        .in("document_type", IMPACT_DOC_TYPES)
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
      return true;
    });
  }, [farms, statusFilter, typeFilter, countyFilter]);

  const filterActive =
    statusFilter !== "all" ||
    typeFilter !== ALL_TYPES ||
    countyFilter !== ALL_COUNTIES;

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

  return (
    <div>
      {loading ? (
        <div className="mb-6 text-sm text-charcoal-soft">Loading…</div>
      ) : loadError ? (
        <div className="mb-6 text-sm text-red-700">Error: {loadError}</div>
      ) : (
        <>
          <FarmsSummary
            filteredFarms={filteredFarms}
            totalFarms={farms}
            filterActive={filterActive}
          />
          <div className="mb-4 -mt-2 text-[11px] text-charcoal-soft/80 tabular-nums font-mono">
            Network loaded — {farms.length} farms · {markets.length} markets ·{" "}
            {distributors.length} distributors · {processors.length}{" "}
            processors · {recoveryNodes.length} recovery · {enablers.length}{" "}
            enablers · {persons.length} people · {regions.length} regions ·{" "}
            {relationships.length} connections · {farmCrops.length} crop links ·{" "}
            {impactDocs.length} impact docs
          </div>
        </>
      )}

      <div className="mb-5 rounded-[14px] border border-cream-shadow bg-white px-5 py-4 flex flex-wrap items-center gap-x-8 gap-y-3">
        <div className="flex items-center gap-3">
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
          >
            <ToggleGroupItem value="all">All</ToggleGroupItem>
            <ToggleGroupItem value="enrolled">Enrolled</ToggleGroupItem>
            <ToggleGroupItem value="engaged">Engaged</ToggleGroupItem>
            <ToggleGroupItem value="prospect">Prospect</ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft">
            Farm type
          </label>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="min-w-[180px]">
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
          <div className="flex items-center gap-3">
            <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-soft">
              County
            </label>
            <Select value={countyFilter} onValueChange={setCountyFilter}>
              <SelectTrigger className="min-w-[180px]">
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

        {filterActive ? (
          <button
            type="button"
            onClick={() => {
              setStatusFilter("all");
              setTypeFilter(ALL_TYPES);
              setCountyFilter(ALL_COUNTIES);
            }}
            className="ml-auto text-xs text-charcoal-soft underline underline-offset-2 hover:text-moss"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList>
          <TabsTrigger value="map">Map</TabsTrigger>
          <TabsTrigger value="network">Network</TabsTrigger>
          <TabsTrigger value="flows">Flows</TabsTrigger>
          {embedMode ? null : (
            <>
              <TabsTrigger value="list">List</TabsTrigger>
              <TabsTrigger value="directory">Directory</TabsTrigger>
              <TabsTrigger value="county">By county</TabsTrigger>
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            </>
          )}
        </TabsList>
        <TabsContent value="map" className="mt-4">
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
              />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="network" className="mt-4">
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
              />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="flows" className="mt-4">
          <NetworkFlows
            farms={filteredFarms}
            markets={filteredMarkets}
            distributors={filteredDistributors}
            processors={filteredProcessors}
            recoveryNodes={filteredRecoveryNodes}
            relationships={relationships}
          />
        </TabsContent>
        <TabsContent value="list" className="mt-4">
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
        </TabsContent>
        <TabsContent value="directory" className="mt-4">
          <NetworkDirectory
            farms={farms}
            markets={markets}
            distributors={distributors}
            processors={processors}
            recoveryNodes={recoveryNodes}
            enablers={enablers}
            statusFilter={statusFilter}
          />
        </TabsContent>
        <TabsContent value="county" className="mt-4">
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
              />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="dashboard" className="mt-4">
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
            ) : persona === "buyer" ? (
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
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <EntityDetailOverlay
        entity={selectedEntity}
        entityCount={mapPinCount}
        onClose={() => setSelectedEntity(null)}
        embedMode={embedMode}
      />

      {embedMode ? <EmbedCta /> : null}
    </div>
  );
}
