"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import { FarmsMap } from "./farms-map";
import { FarmsList } from "./farms-list";
import { FarmsByCounty } from "./farms-by-county";

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

export function FarmsExplorer() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  const summary = loading
    ? "Loading…"
    : loadError
      ? `Error: ${loadError}`
      : `${farms.length} farms across ${countUniqueCounties(farms)} counties`;

  return (
    <div>
      <div className="mb-4 text-sm text-zinc-600">{summary}</div>
      <Tabs defaultValue="map" className="w-full">
        <TabsList>
          <TabsTrigger value="map">Map</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="county">By county</TabsTrigger>
        </TabsList>
        <TabsContent value="map" className="mt-4">
          <FarmsMap farms={farms} />
        </TabsContent>
        <TabsContent value="list" className="mt-4">
          <FarmsList farms={farms} />
        </TabsContent>
        <TabsContent value="county" className="mt-4">
          <FarmsByCounty farms={farms} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function countUniqueCounties(farms: Farm[]): number {
  const set = new Set<string>();
  for (const f of farms) {
    const name = (f.attributes as { county_name?: string } | null)?.county_name;
    if (name) set.add(name);
  }
  return set.size;
}
