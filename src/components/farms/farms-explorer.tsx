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

type StatusFilter = "all" | "enrolled" | "engaged";
const ALL_TYPES = "__all__";

function prettify(raw: string): string {
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function FarmsExplorer() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<string>(ALL_TYPES);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("farms")
      .select(
        "upid, name, farm_type, afs_member_status, acres_total, gross_revenue_baseline, gross_revenue_baseline_year, afs_priority_tier, county_fips, attributes, geom_point",
      )
      .then(({ data, error }) => {
        setLoading(false);
        if (error) {
          setLoadError(error.message);
          return;
        }
        setFarms((data ?? []) as Farm[]);
      });
  }, []);

  const availableTypes = useMemo(() => {
    const set = new Set<string>();
    for (const f of farms) {
      if (f.farm_type) set.add(f.farm_type);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [farms]);

  const filteredFarms = useMemo(() => {
    return farms.filter((f) => {
      if (statusFilter === "enrolled" && f.afs_member_status !== "enrolled") {
        return false;
      }
      if (statusFilter === "engaged" && f.afs_member_status === "enrolled") {
        return false;
      }
      if (typeFilter !== ALL_TYPES && f.farm_type !== typeFilter) {
        return false;
      }
      return true;
    });
  }, [farms, statusFilter, typeFilter]);

  const filterActive =
    statusFilter !== "all" || typeFilter !== ALL_TYPES;

  return (
    <div>
      {loading ? (
        <div className="mb-4 text-sm text-zinc-600">Loading…</div>
      ) : loadError ? (
        <div className="mb-4 text-sm text-red-700">Error: {loadError}</div>
      ) : (
        <FarmsSummary
          filteredFarms={filteredFarms}
          totalFarms={farms}
          filterActive={filterActive}
        />
      )}

      <div className="mb-4 rounded-lg border border-gray-200 bg-white px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-zinc-600 uppercase tracking-wide">
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
            <ToggleGroupItem value="engaged">Engaged / prospect</ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-zinc-600 uppercase tracking-wide">
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

        {filterActive ? (
          <button
            type="button"
            onClick={() => {
              setStatusFilter("all");
              setTypeFilter(ALL_TYPES);
            }}
            className="ml-auto text-xs text-zinc-600 underline underline-offset-2 hover:text-zinc-900"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      <Tabs defaultValue="map" className="w-full">
        <TabsList>
          <TabsTrigger value="map">Map</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="county">By county</TabsTrigger>
        </TabsList>
        <TabsContent value="map" className="mt-4">
          <FarmsMap farms={filteredFarms} />
        </TabsContent>
        <TabsContent value="list" className="mt-4">
          <FarmsList farms={filteredFarms} />
        </TabsContent>
        <TabsContent value="county" className="mt-4">
          <FarmsByCounty farms={filteredFarms} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
