"use client";

import { useState } from "react";
import Map, {
  Marker,
  NavigationControl,
  Popup,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Farm } from "./farms-explorer";

function prettify(raw: string | null): string {
  if (!raw) return "—";
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCurrency(amount: number | null): string {
  if (amount == null) return "—";
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function FarmsMap({ farms }: { farms: Farm[] }) {
  const [selected, setSelected] = useState<Farm | null>(null);

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
        onClick={() => setSelected(null)}
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
                setSelected(farm);
              }}
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
                  border:
                    selected?.upid === farm.upid
                      ? "3px solid #1e40af"
                      : "2px solid white",
                  boxShadow: "0 0 4px rgba(0,0,0,0.35)",
                  cursor: "pointer",
                  transition: "border 0.15s ease",
                }}
              />
            </Marker>
          ) : null,
        )}

        {selected?.geom_point ? (
          <Popup
            longitude={selected.geom_point.coordinates[0]}
            latitude={selected.geom_point.coordinates[1]}
            anchor="bottom"
            offset={12}
            onClose={() => setSelected(null)}
            closeButton={true}
            closeOnClick={false}
            maxWidth="280px"
          >
            <FarmPopupContent farm={selected} />
          </Popup>
        ) : null}
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
        <div className="pt-1 text-[10px] text-zinc-500">
          Click a dot for details
        </div>
      </div>
    </div>
  );
}

function FarmPopupContent({ farm }: { farm: Farm }) {
  const countyName =
    (farm.attributes as { county_name?: string } | null)?.county_name ?? null;
  const enrolled = farm.afs_member_status === "enrolled";

  return (
    <div className="text-sm font-sans">
      <div className="font-semibold text-zinc-900 text-[15px] leading-tight mb-1 pr-4">
        {farm.name}
      </div>
      {countyName ? (
        <div className="text-xs text-zinc-500 mb-2">{countyName}</div>
      ) : null}

      <div className="space-y-1 text-xs">
        <Row label="Type" value={prettify(farm.farm_type)} />
        <Row
          label="Acres"
          value={farm.acres_total?.toLocaleString() ?? "—"}
        />
        {farm.gross_revenue_baseline != null ? (
          <Row
            label={`Revenue (${farm.gross_revenue_baseline_year ?? "baseline"})`}
            value={formatCurrency(farm.gross_revenue_baseline)}
          />
        ) : null}
      </div>

      <div className="mt-2">
        <span
          className={
            "inline-block px-2 py-0.5 rounded-full text-[11px] font-medium " +
            (enrolled
              ? "bg-green-100 text-green-800"
              : "bg-amber-100 text-amber-800")
          }
        >
          {prettify(farm.afs_member_status)}
        </span>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-zinc-500">{label}</span>
      <span className="text-zinc-900 tabular-nums text-right">{value}</span>
    </div>
  );
}
