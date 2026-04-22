"use client";

import { useMemo } from "react";
import MapGL, {
  Marker,
  NavigationControl,
  Source,
  Layer,
  type MapLayerMouseEvent,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

export type ChoroplethMetric =
  | "food_insecurity"
  | "farm_count"
  | "enrolled_pct"
  | "food_deserts";

type GeomPoint = { coordinates: [number, number] } | null;

type RegionLike = {
  name: string;
  region_type: string | null;
  attributes: Record<string, unknown> | null;
  geom_boundary: unknown;
  geom_point: GeomPoint;
};

type FarmLike = {
  upid: string;
  afs_member_status: string | null;
  attributes: Record<string, unknown> | null;
  geom_point?: GeomPoint;
};

type PinLike = {
  upid: string;
  geom_point: GeomPoint;
};

const METRIC_CONFIG: Record<
  ChoroplethMetric,
  {
    label: string;
    property: string;
    lowStop: number;
    highStop: number;
    lowColor: string;
    highColor: string;
    fmt: (v: number) => string;
  }
> = {
  food_insecurity: {
    label: "Food-insecurity rate",
    property: "food_insecurity_rate",
    lowStop: 0.05,
    highStop: 0.16,
    lowColor: "#f7f3eb",
    highColor: "#b86b4b",
    fmt: (v) => `${(v * 100).toFixed(0)}%`,
  },
  farm_count: {
    label: "Farms in production",
    property: "farm_count",
    lowStop: 0,
    highStop: 15,
    lowColor: "#f7f3eb",
    highColor: "#2f4a3a",
    fmt: (v) => `${Math.round(v)}`,
  },
  enrolled_pct: {
    label: "% enrolled with AFS",
    property: "enrolled_pct",
    lowStop: 0,
    highStop: 0.5,
    lowColor: "#f7f3eb",
    highColor: "#c77f2a",
    fmt: (v) => `${(v * 100).toFixed(0)}%`,
  },
  food_deserts: {
    label: "Food-desert tracts",
    property: "food_desert_tracts",
    lowStop: 0,
    highStop: 10,
    lowColor: "#f7f3eb",
    highColor: "#b86b4b",
    fmt: (v) => `${Math.round(v)}`,
  },
};

type Props = {
  regions: RegionLike[];
  farms: FarmLike[];
  markets: PinLike[];
  processors: PinLike[];
  recoveryNodes: PinLike[];
  enablers: PinLike[];
  selectedCounty: string;
  onSelectCounty: (name: string) => void;
  metric: ChoroplethMetric;
};

export function PolicymakerMap({
  regions,
  farms,
  markets,
  processors,
  recoveryNodes,
  enablers,
  selectedCounty,
  onSelectCounty,
  metric,
}: Props) {
  const { geojson, metricRange } = useMemo(() => {
    const counties = regions.filter((r) => r.region_type === "county");
    const farmsByCounty = new Map<string, FarmLike[]>();
    for (const f of farms) {
      const c =
        (f.attributes as { county_name?: string } | null)?.county_name ?? "";
      if (!c) continue;
      const list = farmsByCounty.get(c);
      if (list) list.push(f);
      else farmsByCounty.set(c, [f]);
    }
    let minV = Infinity;
    let maxV = -Infinity;
    const features = counties
      .filter((r) => r.geom_boundary != null)
      .map((c) => {
        const countyFarms = farmsByCounty.get(c.name) ?? [];
        const enrolled = countyFarms.filter(
          (f) => f.afs_member_status === "enrolled",
        ).length;
        const pct =
          countyFarms.length > 0 ? enrolled / countyFarms.length : 0;
        const attrs = (c.attributes ?? {}) as Record<string, unknown>;
        const props = {
          name: c.name,
          food_insecurity_rate:
            typeof attrs.food_insecurity_rate === "number"
              ? attrs.food_insecurity_rate
              : 0,
          poverty_rate:
            typeof attrs.poverty_rate === "number" ? attrs.poverty_rate : 0,
          farm_count: countyFarms.length,
          enrolled_pct: pct,
          food_desert_tracts:
            typeof attrs.food_desert_tract_count === "number"
              ? attrs.food_desert_tract_count
              : 0,
        };
        const v = props[METRIC_CONFIG[metric].property as keyof typeof props];
        if (typeof v === "number") {
          if (v < minV) minV = v;
          if (v > maxV) maxV = v;
        }
        return {
          type: "Feature" as const,
          geometry: c.geom_boundary as GeoJSON.Geometry,
          properties: props,
        };
      });
    return {
      geojson: { type: "FeatureCollection" as const, features },
      metricRange: {
        min: isFinite(minV) ? minV : 0,
        max: isFinite(maxV) ? maxV : 0,
      },
    };
  }, [regions, farms, metric]);

  const cfg = METRIC_CONFIG[metric];

  const handleClick = (e: MapLayerMouseEvent) => {
    const f = e.features?.[0];
    const name = f?.properties?.name;
    if (typeof name === "string") {
      onSelectCounty(name);
    }
  };

  const fillColorExpr: unknown = [
    "interpolate",
    ["linear"],
    ["get", cfg.property],
    cfg.lowStop,
    cfg.lowColor,
    cfg.highStop,
    cfg.highColor,
  ];

  const fillOpacityExpr: unknown = [
    "case",
    ["==", ["get", "name"], selectedCounty],
    0.88,
    0.58,
  ];

  const outlineColorExpr: unknown = [
    "case",
    ["==", ["get", "name"], selectedCounty],
    "#1f2421",
    "#4a524e",
  ];

  const outlineWidthExpr: unknown = [
    "case",
    ["==", ["get", "name"], selectedCounty],
    2.8,
    0.7,
  ];

  return (
    <div className="relative w-full h-[440px] md:h-[560px] rounded-[14px] overflow-hidden border border-cream-shadow">
      <MapGL
        initialViewState={{
          longitude: -85.7585,
          latitude: 38.2527,
          zoom: 8.3,
        }}
        mapStyle="https://tiles.openfreemap.org/styles/positron"
        style={{ width: "100%", height: "100%" }}
        interactiveLayerIds={["regions-fill"]}
        onClick={handleClick}
      >
        <NavigationControl position="top-right" />

        {geojson.features.length > 0 ? (
          <Source id="regions" type="geojson" data={geojson}>
            <Layer
              id="regions-fill"
              type="fill"
              paint={{
                "fill-color": fillColorExpr as never,
                "fill-opacity": fillOpacityExpr as never,
              }}
            />
            <Layer
              id="regions-outline"
              type="line"
              paint={{
                "line-color": outlineColorExpr as never,
                "line-width": outlineWidthExpr as never,
                "line-opacity": 0.8,
              }}
            />
          </Source>
        ) : null}

        {/* Entity pins — small, non-interactive */}
        {farms.map((f) =>
          f.geom_point ? (
            <Marker
              key={"f:" + f.upid}
              longitude={f.geom_point.coordinates[0]}
              latitude={f.geom_point.coordinates[1]}
              anchor="center"
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#2f4a3a",
                  border: "1px solid rgba(255,255,255,0.85)",
                  pointerEvents: "none",
                }}
              />
            </Marker>
          ) : null,
        )}
        {markets.map((m) =>
          m.geom_point ? (
            <Marker
              key={"m:" + m.upid}
              longitude={m.geom_point.coordinates[0]}
              latitude={m.geom_point.coordinates[1]}
              anchor="center"
            >
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "#c77f2a",
                  border: "1px solid rgba(255,255,255,0.85)",
                  pointerEvents: "none",
                }}
              />
            </Marker>
          ) : null,
        )}
        {processors.map((p) =>
          p.geom_point ? (
            <Marker
              key={"p:" + p.upid}
              longitude={p.geom_point.coordinates[0]}
              latitude={p.geom_point.coordinates[1]}
              anchor="center"
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#a14a2a",
                  border: "1px solid rgba(255,255,255,0.85)",
                  pointerEvents: "none",
                }}
              />
            </Marker>
          ) : null,
        )}
        {recoveryNodes.map((r) =>
          r.geom_point ? (
            <Marker
              key={"r:" + r.upid}
              longitude={r.geom_point.coordinates[0]}
              latitude={r.geom_point.coordinates[1]}
              anchor="center"
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#6b9370",
                  border: "1px solid rgba(255,255,255,0.85)",
                  pointerEvents: "none",
                }}
              />
            </Marker>
          ) : null,
        )}
        {enablers.map((e) =>
          e.geom_point ? (
            <Marker
              key={"e:" + e.upid}
              longitude={e.geom_point.coordinates[0]}
              latitude={e.geom_point.coordinates[1]}
              anchor="center"
            >
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "#bfa98a",
                  border: "1px solid rgba(255,255,255,0.85)",
                  pointerEvents: "none",
                }}
              />
            </Marker>
          ) : null,
        )}
      </MapGL>

      {/* Choropleth legend */}
      <div className="absolute bottom-4 left-4 bg-white/96 backdrop-blur-sm rounded-[10px] border border-cream-shadow px-3.5 py-2.5 shadow-sm">
        <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-charcoal-soft mb-1.5">
          {cfg.label}
        </div>
        <div
          className="h-2 w-[160px] rounded-full mb-1"
          style={{
            background: `linear-gradient(to right, ${cfg.lowColor}, ${cfg.highColor})`,
            border: "1px solid #e3dcc7",
          }}
        />
        <div className="flex justify-between text-[10px] text-charcoal-soft tabular-nums font-mono">
          <span>{cfg.fmt(cfg.lowStop)}</span>
          <span>{cfg.fmt(cfg.highStop)}</span>
        </div>
        <div className="mt-2 pt-2 border-t border-cream-shadow space-y-1 text-[10px] text-charcoal-soft">
          <LegendDot color="#2f4a3a" label="Farms" />
          <LegendDot color="#c77f2a" label="Markets / buyers" />
          <LegendDot color="#a14a2a" label="Processors" />
          <LegendDot color="#6b9370" label="Recovery nodes" />
          <LegendDot color="#bfa98a" label="Enablers" />
        </div>
      </div>

      {/* Hint */}
      <div className="absolute top-4 left-4 bg-white/92 backdrop-blur-sm rounded-[10px] border border-cream-shadow px-3 py-2 text-[11px] text-charcoal-soft shadow-sm max-w-[220px] leading-snug">
        Click any county to see its details below.
      </div>

      {/* Tiny metric-range stamp — useful diagnostic, unobtrusive */}
      <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur-sm rounded-[8px] px-2 py-1 text-[10px] text-charcoal-soft/70 font-mono tabular-nums">
        {cfg.fmt(metricRange.min)} – {cfg.fmt(metricRange.max)} across 11
        counties
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-block w-2 h-2 rounded-full"
        style={{ background: color }}
      />
      <span>{label}</span>
    </div>
  );
}
