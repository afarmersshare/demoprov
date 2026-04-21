"use client";

import Map, { Marker, NavigationControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Farm } from "./farms-explorer";

export function FarmsMap({ farms }: { farms: Farm[] }) {
  return (
    <div className="relative w-full h-[600px] rounded-lg overflow-hidden border border-gray-200">
      <Map
        initialViewState={{
          longitude: -85.7585,
          latitude: 38.2527,
          zoom: 8.3,
        }}
        mapStyle="https://tiles.openfreemap.org/styles/positron"
        style={{ width: "100%", height: "100%" }}
      >
        <NavigationControl position="top-right" />
        {farms.map((farm) =>
          farm.geom_point ? (
            <Marker
              key={farm.upid}
              longitude={farm.geom_point.coordinates[0]}
              latitude={farm.geom_point.coordinates[1]}
              anchor="center"
            >
              <div
                title={farm.name}
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background:
                    farm.afs_member_status === "enrolled"
                      ? "#15803d"
                      : "#d97706",
                  border: "2px solid white",
                  boxShadow: "0 0 4px rgba(0,0,0,0.35)",
                  cursor: "pointer",
                }}
              />
            </Marker>
          ) : null,
        )}
      </Map>

      <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm rounded-md shadow-md px-3 py-2 text-xs space-y-0.5">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#15803d]" />
          Enrolled AFS member
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#d97706]" />
          Engaged / prospect
        </div>
      </div>
    </div>
  );
}
