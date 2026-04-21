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
    <div className="relative w-full h-[600px] rounded-[14px] overflow-hidden border border-cream-shadow">
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
                      ? "#2f4a3a"
                      : "#c77f2a",
                  border:
                    selected?.upid === farm.upid
                      ? "3px solid #1f2421"
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

      {farms.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-white/95 backdrop-blur-sm rounded-md shadow-md px-4 py-3 text-sm text-zinc-700">
            No farms match these filters — adjust above.
          </div>
        </div>
      ) : null}

      <div className="absolute bottom-4 left-4 bg-white/96 backdrop-blur-sm rounded-[10px] border border-cream-shadow px-4 py-3 text-xs text-charcoal-soft shadow-sm space-y-1.5">
        <div className="flex items-center gap-2.5">
          <span className="inline-block w-3 h-3 rounded-full bg-moss" />
          Enrolled AFS member
        </div>
        <div className="flex items-center gap-2.5">
          <span className="inline-block w-3 h-3 rounded-full bg-amber" />
          Engaged / prospect
        </div>
        <div className="pt-1 text-[10px] text-charcoal-soft/70">
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
    <div className="text-sm">
      <div className="font-display text-[18px] font-semibold text-moss leading-tight mb-1 pr-4 tracking-[-0.01em]">
        {farm.name}
      </div>
      {countyName ? (
        <div className="text-xs text-charcoal-soft mb-2">{countyName}</div>
      ) : null}

      <div className="space-y-1.5 text-xs">
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

      <div className="mt-2.5">
        <span
          className={
            "inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium " +
            (enrolled
              ? "bg-moss text-cream"
              : "bg-bone text-charcoal")
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
    <div className="flex justify-between gap-3 border-t border-cream-shadow pt-1.5 first:border-t-0 first:pt-0">
      <span className="text-charcoal-soft">{label}</span>
      <span className="text-charcoal tabular-nums font-semibold text-right">
        {value}
      </span>
    </div>
  );
}
