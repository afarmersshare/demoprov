// Per-report CSV generators. Each function takes a slice of the demo
// dataset (whatever the report needs) and returns { filename, csv }.
// The Reports tab calls these and hands the result to downloadCsv().

import type {
  Farm,
  Market,
  Distributor,
  Processor,
  RecoveryNode,
  Enabler,
  FarmCrop,
  ImpactDoc,
  Region,
  ComplianceInfo,
} from "@/components/farms/network-explorer";
import { buildCsv, stampedFilename, type CsvColumn } from "@/lib/csv";

function countyOf(f: Farm): string {
  return (f.attributes as { county_name?: string } | null)?.county_name ?? "";
}

function firstCrops(farm: Farm, crops: FarmCrop[], limit = 3): string {
  return crops
    .filter((c) => c.farm_upid === farm.upid)
    .map((c) => c.crop_type)
    .slice(0, limit)
    .join("; ");
}

function farmDocTypes(farm: Farm, docs: ImpactDoc[]): string {
  return Array.from(
    new Set(docs.filter((d) => d.node_upid === farm.upid).map((d) => d.document_type)),
  ).join("; ");
}

// ========== Regional supply snapshot ==========
export function regionalSupplyCsv(args: {
  farms: Farm[];
  farmCrops: FarmCrop[];
  compliance: Map<string, ComplianceInfo>;
}) {
  const cols: CsvColumn<Farm>[] = [
    { header: "upid", value: (f) => f.upid },
    { header: "name", value: (f) => f.name },
    { header: "county", value: (f) => countyOf(f) },
    { header: "afs_member_status", value: (f) => f.afs_member_status ?? "" },
    { header: "farm_type", value: (f) => f.farm_type ?? "" },
    { header: "acres_total", value: (f) => f.acres_total ?? "" },
    {
      header: "primary_crops",
      value: (f) => firstCrops(f, args.farmCrops, 5),
    },
    {
      header: "regen_claim_verified",
      value: (f) => f.regenerative_claim_verified ?? "",
    },
    {
      header: "compliance_status",
      value: (f) => args.compliance.get(f.upid)?.status ?? "",
    },
    {
      header: "compliance_missing",
      value: (f) => (args.compliance.get(f.upid)?.missing ?? []).join("; "),
    },
  ];
  return {
    filename: stampedFilename("regional_supply_snapshot", "csv"),
    csv: buildCsv(args.farms, cols),
  };
}

// ========== Food recovery ==========
export function foodRecoveryCsv(args: { recoveryNodes: RecoveryNode[] }) {
  const cols: CsvColumn<RecoveryNode>[] = [
    { header: "upid", value: (r) => r.upid },
    { header: "name", value: (r) => r.name },
    { header: "type", value: (r) => r.recovery_node_type ?? "" },
    {
      header: "description",
      value: (r) => r.description ?? "",
    },
    {
      header: "has_cold_storage",
      value: (r) =>
        (r.attributes as { has_cold_storage?: boolean } | null)?.has_cold_storage
          ? "yes"
          : "no",
    },
    {
      header: "has_freezer",
      value: (r) =>
        (r.attributes as { has_freezer?: boolean } | null)?.has_freezer
          ? "yes"
          : "no",
    },
    {
      header: "afs_active",
      value: (r) =>
        (r.attributes as { afs_active?: boolean } | null)?.afs_active
          ? "yes"
          : "no",
    },
  ];
  return {
    filename: stampedFilename("food_recovery_report", "csv"),
    csv: buildCsv(args.recoveryNodes, cols),
  };
}

// ========== Procurement readiness ==========
export function procurementReadinessCsv(args: {
  farms: Farm[];
  farmCrops: FarmCrop[];
  compliance: Map<string, ComplianceInfo>;
}) {
  type Row = Farm & { _status: string; _missing: string };
  const enriched: Row[] = args.farms
    .filter((f) => f.afs_member_status !== "prospect")
    .map((f) => ({
      ...f,
      _status: args.compliance.get(f.upid)?.status ?? "",
      _missing: (args.compliance.get(f.upid)?.missing ?? []).join("; "),
    }))
    .sort((a, b) => {
      const order: Record<string, number> = {
        buyer_ready: 0,
        close: 1,
        needs_work: 2,
      };
      return (order[a._status] ?? 3) - (order[b._status] ?? 3);
    });

  const cols: CsvColumn<Row>[] = [
    { header: "upid", value: (r) => r.upid },
    { header: "farm_name", value: (r) => r.name },
    { header: "county", value: (r) => countyOf(r) },
    { header: "farm_type", value: (r) => r.farm_type ?? "" },
    { header: "acres_total", value: (r) => r.acres_total ?? "" },
    {
      header: "primary_crops",
      value: (r) => firstCrops(r, args.farmCrops, 5),
    },
    { header: "compliance_status", value: (r) => r._status },
    { header: "compliance_gaps", value: (r) => r._missing },
  ];

  return {
    filename: stampedFilename("procurement_readiness", "csv"),
    csv: buildCsv(enriched, cols),
  };
}

// ========== Regen certification audit ==========
export function regenCertAuditCsv(args: {
  farms: Farm[];
  impactDocs: ImpactDoc[];
}) {
  const cols: CsvColumn<Farm>[] = [
    { header: "upid", value: (f) => f.upid },
    { header: "farm_name", value: (f) => f.name },
    { header: "county", value: (f) => countyOf(f) },
    {
      header: "regen_claim",
      value: (f) => f.regenerative_claim_verified ?? "",
    },
    { header: "scope3_platform", value: (f) => f.scope3_platform ?? "" },
    {
      header: "risk_flags",
      value: (f) => (f.claim_risk_flags ?? []).join("; "),
    },
    {
      header: "current_doc_types",
      value: (f) => farmDocTypes(f, args.impactDocs),
    },
  ];
  return {
    filename: stampedFilename("regen_certification_audit", "csv"),
    csv: buildCsv(args.farms, cols),
  };
}

// ========== Gap analysis ==========
export function gapAnalysisCsv(args: {
  farms: Farm[];
  regions: Region[];
  countyDemand: Record<string, number>;
}) {
  type Row = {
    county: string;
    supply: number;
    demand: number;
    gap_pct: number;
    status: string;
  };
  const supplyByCounty = new Map<string, number>();
  for (const f of args.farms) {
    if (f.afs_member_status !== "enrolled") continue;
    const c = countyOf(f);
    if (!c) continue;
    supplyByCounty.set(c, (supplyByCounty.get(c) ?? 0) + 1);
  }
  const rows: Row[] = args.regions
    .filter((r) => r.region_type === "county")
    .map((c) => {
      const supply = supplyByCounty.get(c.name) ?? 0;
      const demand = args.countyDemand[c.name] ?? Math.max(supply, 1) * 1.1;
      const gapPct = demand > 0 ? (supply - demand) / demand : 0;
      return {
        county: c.name,
        supply,
        demand: Math.round(demand * 10) / 10,
        gap_pct: Math.round(gapPct * 1000) / 10,
        status: gapPct < 0 ? "gap" : "surplus",
      };
    })
    .sort((a, b) => a.gap_pct - b.gap_pct);

  const cols: CsvColumn<Row>[] = [
    { header: "county", value: (r) => r.county },
    { header: "supply_enrolled_farms", value: (r) => r.supply },
    { header: "demand_indicator", value: (r) => r.demand },
    { header: "gap_surplus_pct", value: (r) => r.gap_pct },
    { header: "status", value: (r) => r.status },
  ];
  return {
    filename: stampedFilename("gap_analysis", "csv"),
    csv: buildCsv(rows, cols),
  };
}

// ========== Full dataset export ==========
export function fullDatasetCsv(args: {
  farms: Farm[];
  markets: Market[];
  distributors: Distributor[];
  processors: Processor[];
  recoveryNodes: RecoveryNode[];
  enablers: Enabler[];
}) {
  type EntityRow = {
    upid: string;
    kind: string;
    name: string;
    sub_type: string;
    county_or_address: string;
    afs_member_status: string;
    lng: string;
    lat: string;
  };

  const rows: EntityRow[] = [];
  for (const f of args.farms) {
    rows.push({
      upid: f.upid,
      kind: "farm",
      name: f.name,
      sub_type: f.farm_type ?? "",
      county_or_address: countyOf(f),
      afs_member_status: f.afs_member_status ?? "",
      lng: f.geom_point?.coordinates?.[0]?.toString() ?? "",
      lat: f.geom_point?.coordinates?.[1]?.toString() ?? "",
    });
  }
  for (const m of args.markets) {
    rows.push({
      upid: m.upid,
      kind: "market",
      name: m.name,
      sub_type: m.market_type ?? "",
      county_or_address: m.address_text ?? "",
      afs_member_status: m.afs_member_status ?? "",
      lng: m.geom_point?.coordinates?.[0]?.toString() ?? "",
      lat: m.geom_point?.coordinates?.[1]?.toString() ?? "",
    });
  }
  for (const d of args.distributors) {
    rows.push({
      upid: d.upid,
      kind: "distributor",
      name: d.name,
      sub_type: d.distributor_type ?? "",
      county_or_address: d.address_text ?? "",
      afs_member_status: d.afs_member_status ?? "",
      lng: d.geom_point?.coordinates?.[0]?.toString() ?? "",
      lat: d.geom_point?.coordinates?.[1]?.toString() ?? "",
    });
  }
  for (const p of args.processors) {
    rows.push({
      upid: p.upid,
      kind: "processor",
      name: p.name,
      sub_type: p.processor_type ?? "",
      county_or_address: p.address_text ?? "",
      afs_member_status: p.afs_member_status ?? "",
      lng: p.geom_point?.coordinates?.[0]?.toString() ?? "",
      lat: p.geom_point?.coordinates?.[1]?.toString() ?? "",
    });
  }
  for (const r of args.recoveryNodes) {
    rows.push({
      upid: r.upid,
      kind: "recovery_node",
      name: r.name,
      sub_type: r.recovery_node_type ?? "",
      county_or_address: r.description ?? "",
      afs_member_status: "",
      lng: r.geom_point?.coordinates?.[0]?.toString() ?? "",
      lat: r.geom_point?.coordinates?.[1]?.toString() ?? "",
    });
  }
  for (const e of args.enablers) {
    rows.push({
      upid: e.upid,
      kind: "enabler",
      name: e.name,
      sub_type: e.enabler_type ?? "",
      county_or_address: e.description ?? "",
      afs_member_status: "",
      lng: e.geom_point?.coordinates?.[0]?.toString() ?? "",
      lat: e.geom_point?.coordinates?.[1]?.toString() ?? "",
    });
  }

  const cols: CsvColumn<EntityRow>[] = [
    { header: "upid", value: (r) => r.upid },
    { header: "kind", value: (r) => r.kind },
    { header: "name", value: (r) => r.name },
    { header: "sub_type", value: (r) => r.sub_type },
    { header: "county_or_address", value: (r) => r.county_or_address },
    { header: "afs_member_status", value: (r) => r.afs_member_status },
    { header: "longitude", value: (r) => r.lng },
    { header: "latitude", value: (r) => r.lat },
  ];
  return {
    filename: stampedFilename("provender_full_dataset", "csv"),
    csv: buildCsv(rows, cols),
  };
}

// Exposed so both the tab UI and the /reports/gap-analysis page share
// the same demand indicators. Source of truth for demo — real build
// pulls from USDA access data etc.
export const COUNTY_DEMAND_INDICATOR: Record<string, number> = {
  Jefferson: 14,
  Oldham: 5,
  Bullitt: 11,
  Shelby: 5,
  Henry: 7,
  Spencer: 8,
  Anderson: 6,
  Nelson: 12,
  Trimble: 4,
  Carroll: 3,
  "Floyd (IN)": 9,
  "Clark (IN)": 11,
};
