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
import { FarmsByCounty } from "./farms-by-county";
import { FarmsSummary } from "./farms-summary";
import { FarmDetailPanel, FarmDetailOverlay } from "./farm-detail-panel";
import { NetworkDirectory } from "./network-directory";

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

type StatusFilter = "all" | "enrolled" | "engaged" | "prospect";
const ALL_TYPES = "__all__";
const ALL_COUNTIES = "__all_counties__";

function prettify(raw: string): string {
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function NetworkExplorer() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [farmCrops, setFarmCrops] = useState<FarmCrop[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<string>(ALL_TYPES);
  const [countyFilter, setCountyFilter] = useState<string>(ALL_COUNTIES);
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase
        .from("farms")
        .select(
          "upid, name, farm_type, afs_member_status, acres_total, gross_revenue_baseline, gross_revenue_baseline_year, afs_priority_tier, county_fips, attributes, geom_point",
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
    ]).then((results) => {
      setLoading(false);
      const firstError = results.find((r) => r.error)?.error;
      if (firstError) {
        setLoadError(firstError.message);
        return;
      }
      const [fRes, mRes, dRes, rRes, cRes, relRes] = results;
      setFarms((fRes.data ?? []) as Farm[]);
      setMarkets((mRes.data ?? []) as Market[]);
      setDistributors((dRes.data ?? []) as Distributor[]);
      setRegions((rRes.data ?? []) as Region[]);
      setFarmCrops((cRes.data ?? []) as FarmCrop[]);
      setRelationships((relRes.data ?? []) as Relationship[]);
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

  useEffect(() => {
    if (!selectedFarm) return;
    const stillIn = filteredFarms.some((f) => f.upid === selectedFarm.upid);
    if (!stillIn) setSelectedFarm(null);
  }, [filteredFarms, selectedFarm]);

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
            {distributors.length} distributors · {regions.length} regions ·{" "}
            {relationships.length} connections · {farmCrops.length} crop links
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

      <Tabs defaultValue="map" className="w-full">
        <TabsList>
          <TabsTrigger value="map">Map</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="directory">Directory</TabsTrigger>
          <TabsTrigger value="county">By county</TabsTrigger>
        </TabsList>
        <TabsContent value="map" className="mt-4">
          <div className="md:grid md:grid-cols-[1fr_340px] md:gap-5">
            <FarmsMap
              farms={filteredFarms}
              selected={selectedFarm}
              onSelect={setSelectedFarm}
            />
            <div className="hidden md:block">
              <FarmDetailPanel
                farm={selectedFarm}
                farmCount={filteredFarms.length}
                hintToClick="Click any marker on the map to see details for that farm."
              />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="list" className="mt-4">
          <div className="md:grid md:grid-cols-[1fr_340px] md:gap-5">
            <FarmsList
              farms={filteredFarms}
              selected={selectedFarm}
              onSelect={setSelectedFarm}
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
            statusFilter={statusFilter}
          />
        </TabsContent>
        <TabsContent value="county" className="mt-4">
          <FarmsByCounty farms={filteredFarms} />
        </TabsContent>
      </Tabs>

      <FarmDetailOverlay
        farm={selectedFarm}
        farmCount={filteredFarms.length}
        onClose={() => setSelectedFarm(null)}
      />
    </div>
  );
}
