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
import type {
  Farm,
  FarmCrop,
  Market,
  Processor,
  RecoveryNode,
  Enabler,
  Region,
  NetworkEntity,
} from "../farms/network-explorer";

export type ChoroplethMetric =
  | "food_insecurity"
  | "farm_count"
  | "enrolled_pct"
  | "food_deserts"
  | "regenerative_acres";

const REGENERATIVE_METHODS = new Set([
  "certified_organic",
  "transitional_organic",
  "certified_regenerative",
  "beyond_organic",
  "pasture_raised",
]);

const PIN_COLOR = {
  farm: "#2f4a3a",
  market: "#c77f2a",
  processor: "#a14a2a",
  recovery_node: "#6b9370",
  enabler: "#bfa98a",
} as const;

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
  regenerative_acres: {
    label: "Acres under regen / organic practice",
    property: "regenerative_acres",
    lowStop: 0,
    highStop: 800,
    lowColor: "#f7f3eb",
    highColor: "#2f4a3a",
    fmt: (v) => `${Math.round(v).toLocaleString()} ac`,
  },
};

type Props = {
  regions: Region[];
  farms: Farm[];
  farmCrops: FarmCrop[];
  markets: Market[];
  processors: Processor[];
  recoveryNodes: RecoveryNode[];
  enablers: Enabler[];
  selectedCounty: string;
  onSelectCounty: (name: string) => void;
  metric: ChoroplethMetric;
  selectedEntity: NetworkEntity | null;
  onSelectEntity: (e: NetworkEntity | null) => void;
};

export function PolicymakerMap({
  regions,
  farms,
  farmCrops,
  markets,
  processors,
  recoveryNodes,
  enablers,
  selectedCounty,
  onSelectCounty,
  metric,
  selectedEntity,
  onSelectEntity,
}: Props) {
  const { geojson, metricRange } = useMemo(() => {
    const counties = regions.filter((r) => r.region_type === "county");
    const farmsByCounty = new Map<string, Farm[]>();
    for (const f of farms) {
      const c =
        (f.attributes as { county_name?: string } | null)?.county_name ?? "";
      if (!c) continue;
      const list = farmsByCounty.get(c);
      if (list) list.push(f);
      else farmsByCounty.set(c, [f]);
    }
    // Sum of regenerative / organic acres per county, from farm_crops.
    const regenAcresByCounty = new Map<string, number>();
    {
      const farmToCounty = new Map<string, string>();
      for (const f of farms) {
        const c =
          (f.attributes as { county_name?: string } | null)?.county_name ?? "";
        if (c) farmToCounty.set(f.upid, c);
      }
      for (const crop of farmCrops) {
        if (
          !crop.production_method ||
          !REGENERATIVE_METHODS.has(crop.production_method)
        ) {
          continue;
        }
        const cname = farmToCounty.get(crop.farm_upid);
        if (!cname) continue;
        regenAcresByCounty.set(
          cname,
          (regenAcresByCounty.get(cname) ?? 0) + (crop.acres ?? 0),
        );
      }
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
          regenerative_acres: regenAcresByCounty.get(c.name) ?? 0,
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
  }, [regions, farms, farmCrops, metric]);

  const cfg = METRIC_CONFIG[metric];

  const handleMapClick = (e: MapLayerMouseEvent) => {
    const f = e.features?.[0];
    const name = f?.properties?.name;
    if (typeof name === "string") {
      onSelectCounty(name);
    } else {
      // background click clears entity selection
      onSelectEntity(null);
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

  const isSelectedEntity = (kind: NetworkEntity["kind"], upid: string) =>
    selectedEntity !== null &&
    selectedEntity.kind === kind &&
    selectedEntity.data.upid === upid;

  return (
    <div className="relative w-full h-[460px] md:h-[580px] rounded-[14px] overflow-hidden border border-cream-shadow">
      <MapGL
        initialViewState={{
          longitude: -85.7585,
          latitude: 38.2527,
          zoom: 8.3,
        }}
        mapStyle="https://tiles.openfreemap.org/styles/positron"
        style={{ width: "100%", height: "100%" }}
        interactiveLayerIds={["regions-fill"]}
        onClick={handleMapClick}
        // Cooperative gestures: single-finger scrolls the page, two
        // fingers pan/zoom the map. Same pattern as the main farms map.
        cooperativeGestures
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

        {farms.map((f) =>
          f.geom_point ? (
            <EntityPin
              key={"f:" + f.upid}
              kind="farm"
              name={f.name}
              coords={f.geom_point.coordinates}
              selected={isSelectedEntity("farm", f.upid)}
              onClick={() => onSelectEntity({ kind: "farm", data: f })}
            />
          ) : null,
        )}
        {markets.map((m) =>
          m.geom_point ? (
            <EntityPin
              key={"m:" + m.upid}
              kind="market"
              name={m.name}
              coords={m.geom_point.coordinates}
              selected={isSelectedEntity("market", m.upid)}
              onClick={() => onSelectEntity({ kind: "market", data: m })}
            />
          ) : null,
        )}
        {processors.map((p) =>
          p.geom_point ? (
            <EntityPin
              key={"p:" + p.upid}
              kind="processor"
              name={p.name}
              coords={p.geom_point.coordinates}
              selected={isSelectedEntity("processor", p.upid)}
              onClick={() => onSelectEntity({ kind: "processor", data: p })}
            />
          ) : null,
        )}
        {recoveryNodes.map((r) =>
          r.geom_point ? (
            <EntityPin
              key={"r:" + r.upid}
              kind="recovery_node"
              name={r.name}
              coords={r.geom_point.coordinates}
              selected={isSelectedEntity("recovery_node", r.upid)}
              onClick={() =>
                onSelectEntity({ kind: "recovery_node", data: r })
              }
            />
          ) : null,
        )}
        {enablers.map((e) =>
          e.geom_point ? (
            <EntityPin
              key={"e:" + e.upid}
              kind="enabler"
              name={e.name}
              coords={e.geom_point.coordinates}
              selected={isSelectedEntity("enabler", e.upid)}
              onClick={() => onSelectEntity({ kind: "enabler", data: e })}
            />
          ) : null,
        )}
      </MapGL>

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
        <div className="mt-2 pt-2 border-t border-cream-shadow grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-charcoal-soft">
          <LegendDot color={PIN_COLOR.farm} label="Farms" />
          <LegendDot color={PIN_COLOR.market} label="Markets" />
          <LegendDot color={PIN_COLOR.processor} label="Processors" />
          <LegendDot color={PIN_COLOR.recovery_node} label="Recovery" />
          <LegendDot color={PIN_COLOR.enabler} label="Enablers" />
        </div>
      </div>

      <div className="absolute top-4 left-4 bg-white/92 backdrop-blur-sm rounded-[10px] border border-cream-shadow px-3 py-2 text-[11px] text-charcoal-soft shadow-sm max-w-[240px] leading-snug">
        Click a county to drive the cards below. Click a pin to see that
        entity&apos;s details.
      </div>

      <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur-sm rounded-[8px] px-2 py-1 text-[10px] text-charcoal-soft/70 font-mono tabular-nums">
        {cfg.fmt(metricRange.min)} – {cfg.fmt(metricRange.max)} across 11
        counties
      </div>
    </div>
  );
}

function EntityPin({
  kind,
  name,
  coords,
  selected,
  onClick,
}: {
  kind: keyof typeof PIN_COLOR;
  name: string;
  coords: [number, number];
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <Marker
      longitude={coords[0]}
      latitude={coords[1]}
      anchor="center"
      onClick={(e) => {
        e.originalEvent.stopPropagation();
        onClick();
      }}
    >
      <div
        title={name}
        style={{
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: PIN_COLOR[kind],
          border: selected ? "3px solid #1f2421" : "2px solid white",
          boxShadow: "0 2px 6px rgba(0,0,0,0.28)",
          cursor: "pointer",
          transition: "border 0.15s ease, transform 0.1s ease",
          transform: selected ? "scale(1.3)" : "scale(1)",
        }}
      />
    </Marker>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="inline-block w-2 h-2 rounded-full"
        style={{ background: color }}
      />
      <span>{label}</span>
    </div>
  );
}
