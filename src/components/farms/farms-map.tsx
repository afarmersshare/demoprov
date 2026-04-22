"use client";

import { useEffect, useRef } from "react";
import Map, {
  Marker,
  NavigationControl,
  type MapRef,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Farm } from "./network-explorer";

function markerColor(status: string | null): string {
  if (status === "enrolled") return "#2f4a3a";
  if (status === "engaged") return "#c77f2a";
  if (status === "prospect") return "#b86b4b";
  return "#4a524e";
}

type Props = {
  farms: Farm[];
  selected: Farm | null;
  onSelect: (farm: Farm | null) => void;
};

export function FarmsMap({ farms, selected, onSelect }: Props) {
  const mapRef = useRef<MapRef | null>(null);
  const hasAutoFittedOnceRef = useRef(false);

  useEffect(() => {
    if (!hasAutoFittedOnceRef.current) {
      hasAutoFittedOnceRef.current = true;
      return;
    }
    const map = mapRef.current;
    if (!map) return;
    const points = farms
      .filter((f) => f.geom_point)
      .map((f) => f.geom_point!.coordinates);
    if (points.length === 0) return;
    if (points.length === 1) {
      map.flyTo({ center: points[0], zoom: 11, duration: 700 });
      return;
    }
    let minLng = points[0][0];
    let maxLng = points[0][0];
    let minLat = points[0][1];
    let maxLat = points[0][1];
    for (const [lng, lat] of points) {
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
  }, [farms]);

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
        {farms.map((farm) =>
          farm.geom_point ? (
            <Marker
              key={farm.upid}
              longitude={farm.geom_point.coordinates[0]}
              latitude={farm.geom_point.coordinates[1]}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                onSelect(farm);
              }}
            >
              <div
                title={farm.name}
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: markerColor(farm.afs_member_status),
                  border:
                    selected?.upid === farm.upid
                      ? "3px solid #1f2421"
                      : "2px solid white",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                  cursor: "pointer",
                  transition: "border 0.15s ease, transform 0.1s ease",
                  transform:
                    selected?.upid === farm.upid ? "scale(1.3)" : "scale(1)",
                }}
              />
            </Marker>
          ) : null,
        )}
      </Map>

      {farms.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-white/95 backdrop-blur-sm rounded-[10px] border border-cream-shadow px-4 py-3 text-sm text-charcoal-soft">
            No farms match these filters — adjust above.
          </div>
        </div>
      ) : null}

      <div className="absolute bottom-4 left-4 bg-white/96 backdrop-blur-sm rounded-[10px] border border-cream-shadow px-4 py-3 text-xs text-charcoal-soft shadow-sm space-y-1.5">
        <div className="flex items-center gap-2.5">
          <span className="inline-block w-3 h-3 rounded-full bg-moss" />
          Enrolled
        </div>
        <div className="flex items-center gap-2.5">
          <span className="inline-block w-3 h-3 rounded-full bg-amber" />
          Engaged
        </div>
        <div className="flex items-center gap-2.5">
          <span className="inline-block w-3 h-3 rounded-full bg-terracotta" />
          Prospect
        </div>
      </div>
    </div>
  );
}
