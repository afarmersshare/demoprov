"use client";

import { useEffect, useMemo, useRef } from "react";
import Map, {
  Marker,
  NavigationControl,
  Source,
  Layer,
  type MapRef,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type {
  Farm,
  Market,
  Distributor,
  Region,
  NetworkEntity,
} from "./network-explorer";

// Map tab currently only plots farm / market / distributor pins. The other
// three kinds are defined on NetworkEntity but never passed to this tab —
// the extra entries exist only to keep the exhaustive Record type satisfied.
const KIND_COLOR: Record<NetworkEntity["kind"], string> = {
  farm: "#2f4a3a",
  market: "#c77f2a",
  distributor: "#7a8aa0",
  processor: "#a14a2a",
  recovery_node: "#6b9370",
  enabler: "#bfa98a",
};

type Props = {
  farms: Farm[];
  markets: Market[];
  distributors: Distributor[];
  regions: Region[];
  selected: NetworkEntity | null;
  onSelect: (entity: NetworkEntity | null) => void;
};

type Plotted = {
  entity: NetworkEntity;
  coords: [number, number];
};

export function FarmsMap({
  farms,
  markets,
  distributors,
  regions,
  selected,
  onSelect,
}: Props) {
  const mapRef = useRef<MapRef | null>(null);
  const hasAutoFittedOnceRef = useRef(false);

  const plotted: Plotted[] = useMemo(() => {
    const list: Plotted[] = [];
    for (const f of farms) {
      if (f.geom_point) {
        list.push({
          entity: { kind: "farm", data: f },
          coords: f.geom_point.coordinates,
        });
      }
    }
    for (const m of markets) {
      if (m.geom_point) {
        list.push({
          entity: { kind: "market", data: m },
          coords: m.geom_point.coordinates,
        });
      }
    }
    for (const d of distributors) {
      if (d.geom_point) {
        list.push({
          entity: { kind: "distributor", data: d },
          coords: d.geom_point.coordinates,
        });
      }
    }
    return list;
  }, [farms, markets, distributors]);

  const regionGeoJson = useMemo(() => {
    const features = regions
      .filter((r) => r.region_type === "county" && r.geom_boundary != null)
      .map((r) => ({
        type: "Feature" as const,
        geometry: r.geom_boundary as GeoJSON.Geometry,
        properties: { name: r.name },
      }));
    return {
      type: "FeatureCollection" as const,
      features,
    };
  }, [regions]);

  useEffect(() => {
    if (!hasAutoFittedOnceRef.current) {
      hasAutoFittedOnceRef.current = true;
      return;
    }
    const map = mapRef.current;
    if (!map) return;
    if (plotted.length === 0) return;
    if (plotted.length === 1) {
      map.flyTo({ center: plotted[0].coords, zoom: 11, duration: 700 });
      return;
    }
    let minLng = plotted[0].coords[0];
    let maxLng = plotted[0].coords[0];
    let minLat = plotted[0].coords[1];
    let maxLat = plotted[0].coords[1];
    for (const p of plotted) {
      const [lng, lat] = p.coords;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
    map.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      { padding: 60, duration: 700, maxZoom: 11 },
    );
  }, [plotted]);

  const isSelected = (e: NetworkEntity) =>
    selected !== null &&
    selected.kind === e.kind &&
    selected.data.upid === e.data.upid;

  return (
    <div className="relative w-full h-[600px] rounded-[14px] overflow-hidden border border-cream-shadow">
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: -85.7585,
          latitude: 38.2527,
          zoom: 8.3,
        }}
        mapStyle="https://tiles.openfreemap.org/styles/positron"
        style={{ width: "100%", height: "100%" }}
        onClick={() => onSelect(null)}
      >
        <NavigationControl position="top-right" />

        {regionGeoJson.features.length > 0 ? (
          <Source id="regions" type="geojson" data={regionGeoJson}>
            <Layer
              id="regions-fill"
              type="fill"
              paint={{
                "fill-color": "#2f4a3a",
                "fill-opacity": 0.04,
              }}
            />
            <Layer
              id="regions-outline"
              type="line"
              paint={{
                "line-color": "#4a524e",
                "line-opacity": 0.35,
                "line-width": 1,
                "line-dasharray": [2, 2],
              }}
            />
          </Source>
        ) : null}

        {plotted.map((p) => {
          const sel = isSelected(p.entity);
          return (
            <Marker
              key={p.entity.kind + ":" + p.entity.data.upid}
              longitude={p.coords[0]}
              latitude={p.coords[1]}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                onSelect(p.entity);
              }}
            >
              <div
                title={p.entity.data.name ?? ""}
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: KIND_COLOR[p.entity.kind],
                  border: sel ? "3px solid #1f2421" : "2px solid white",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                  cursor: "pointer",
                  transition: "border 0.15s ease, transform 0.1s ease",
                  transform: sel ? "scale(1.3)" : "scale(1)",
                }}
              />
            </Marker>
          );
        })}
      </Map>

      {plotted.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-white/95 backdrop-blur-sm rounded-[10px] border border-cream-shadow px-4 py-3 text-sm text-charcoal-soft">
            Nothing matches these filters — adjust above.
          </div>
        </div>
      ) : null}

      <div className="absolute bottom-4 left-4 bg-white/96 backdrop-blur-sm rounded-[10px] border border-cream-shadow px-4 py-3 text-xs text-charcoal-soft shadow-sm space-y-1.5">
        <div className="flex items-center gap-2.5">
          <span
            className="inline-block w-3 h-3 rounded-full"
            style={{ background: KIND_COLOR.farm }}
          />
          Farms
        </div>
        <div className="flex items-center gap-2.5">
          <span
            className="inline-block w-3 h-3 rounded-full"
            style={{ background: KIND_COLOR.market }}
          />
          Markets / buyers
        </div>
        <div className="flex items-center gap-2.5">
          <span
            className="inline-block w-3 h-3 rounded-full"
            style={{ background: KIND_COLOR.distributor }}
          />
          Distributors
        </div>
      </div>
    </div>
  );
}
